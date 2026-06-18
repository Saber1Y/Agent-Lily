import {
  EVM,
  convertQuoteToRoute,
  createConfig,
  executeRoute,
  getQuote,
  type RouteExtended,
} from "@lifi/sdk";
import { createWalletClient, http, type Client } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { YieldAgent, type AgentDecision } from "./agent";
import { getChainConfig } from "./evmChains";
import {
  DEFAULT_FROM_ADDRESS,
  USDC_ADDRESSES,
  getChainName,
  toUsdcBaseUnits,
} from "./lifi";
import {
  getLastExecutionTimestamp,
  getRecentAutomationRuns,
  getStoredAgentConfig,
  persistAutomationRun,
} from "./persistence";
import { generateStrategyReasoning } from "./reasoning";
import {
  formatAutomationTelegramMessage,
  sendTelegramMessage,
} from "./telegram";
import { serverEnv } from "@/env/server";
import { checkBridgeAuthorization, isT3nConfigured } from "./t3n/authorization";

type AutomationStatus =
  | "skipped"
  | "dry_run"
  | "executed"
  | "error";

export interface AutomationResult {
  status: AutomationStatus;
  mode: "analysis" | "execution";
  timestamp: string;
  currentChainId: number;
  amountUsdc: string;
  message: string;
  routeId?: string;
  txLinks?: string[];
  details?: Record<string, string | number | boolean | null | undefined>;
  reasoning?: {
    summary: string;
    thesis: string;
    risks: string[];
    actionBias: "hold" | "rebalance";
    confidence: number;
    model?: string;
  };
}

export async function runAutonomousRebalance(
  triggerSource: "manual" | "cron" = "manual",
  options: { walletAddress?: string } = {},
): Promise<AutomationResult> {
  const privateKey = serverEnv.agentPrivateKey;
  const signerAddress = privateKey
    ? privateKeyToAccount(privateKey as `0x${string}`).address
    : DEFAULT_FROM_ADDRESS;
  const walletAddress = options.walletAddress ?? signerAddress;
  const storedConfig = await getStoredAgentConfig(walletAddress);
  const currentChainId =
    storedConfig?.currentChainId ??
    parseIntegerEnv(serverEnv.agentCurrentChainId, 42161);
  const amountUsdc =
    storedConfig?.positionUsdc || serverEnv.agentPositionUsdc || "100";
  const amountBaseUnits = toUsdcBaseUnits(amountUsdc);
  const autoExecute =
    storedConfig?.autoRebalanceEnabled ??
    (serverEnv.autoRebalanceEnabled === "true");
  const policy = {
    minYieldDeltaPct: storedConfig?.minYieldDeltaPct ?? null,
    minNetGainUsd: storedConfig?.minNetGainUsd ?? null,
    maxRouteCostUsd: storedConfig?.maxRouteCostUsd ?? null,
    allowedDestinationChainIds: storedConfig?.allowedDestinationChainIds ?? null,
    blockedChainIds: storedConfig?.blockedChainIds ?? null,
  };
  const agent = new YieldAgent(signerAddress, currentChainId);
  const cooldownResult = await maybeSkipForCooldown(
    walletAddress,
    storedConfig?.cooldownMinutes,
    currentChainId,
    amountUsdc,
  );
  if (cooldownResult) {
    await persistAutomationRun({ walletAddress, triggerSource, result: cooldownResult });
    await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, cooldownResult);
    return cooldownResult;
  }
  const decision = await agent.analyze(amountBaseUnits, policy);
  const reasoningPromise = getReasoningSafe(decision);

  if (decision.status === "error") {
    const result: AutomationResult = {
      status: "error",
      mode: "analysis",
      timestamp: new Date().toISOString(),
      currentChainId,
      amountUsdc,
      message: decision.message,
      reasoning: await reasoningPromise,
    };
    await persistAutomationRun({ walletAddress, triggerSource, result });
    await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, result);
    await maybeSendTelegramAlert(storedConfig, triggerSource, result);
    return result;
  }

  if (decision.recommendation.action !== "REBALANCE") {
    const result: AutomationResult = {
      status: "skipped",
      mode: "analysis",
      timestamp: new Date().toISOString(),
      currentChainId,
      amountUsdc,
      message: decision.message,
      reasoning: await reasoningPromise,
    };
    await persistAutomationRun({ walletAddress, triggerSource, result });
    await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, result);
    await maybeSendTelegramAlert(storedConfig, triggerSource, result);
    return result;
  }

  const recommendation = decision.recommendation;

  if (!autoExecute || !privateKey) {
    const reviewCommand = await getReviewCommand(recommendation, amountUsdc);
    const result: AutomationResult = {
      status: "dry_run",
      mode: "analysis",
      timestamp: new Date().toISOString(),
      currentChainId,
      amountUsdc,
      message: decision.message,
      routeId: recommendation.quote?.id,
      reasoning: await reasoningPromise,
      details: {
        autoExecute,
        hasPrivateKey: Boolean(privateKey),
        estimatedGasUsd: recommendation.quote?.gasCostUSD,
        estimatedReceivedUsd: recommendation.quote?.toAmountUSD,
        routeCostUsd: decision.analysis?.routeCostUsd,
        projectedAnnualGainUsd: decision.analysis?.projectedAnnualGainUsd,
        projectedNetAnnualGainUsd: decision.analysis?.projectedNetAnnualGainUsd,
        paybackDays: decision.analysis?.paybackDays,
        reviewCommand,
      },
    };
    await persistAutomationRun({ walletAddress, triggerSource, result });
    await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, result);
    await maybeSendTelegramAlert(storedConfig, triggerSource, result);
    return result;
  }

  const t3nCheck = checkBridgeAuthorization(recommendation.fromChain!, recommendation.toChain!, amountUsdc, storedConfig?.t3nBridgeAuth);
  if (!t3nCheck.authorized) {
    if (isT3nConfigured()) {
      const result: AutomationResult = {
        status: "error",
        mode: "analysis",
        timestamp: new Date().toISOString(),
        currentChainId,
        amountUsdc,
        message: `T3N auth gate: autonomous rebalance blocked. ${t3nCheck.reason}`,
        reasoning: await reasoningPromise,
        details: {
          t3nBlocked: true,
          t3nReason: t3nCheck.reason,
          autoExecute,
          hasPrivateKey: Boolean(privateKey),
        },
      };
      await persistAutomationRun({ walletAddress, triggerSource, result });
      await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, result);
      await maybeSendTelegramAlert(storedConfig, triggerSource, result);
      return result;
    }
  }

  const route = await buildRoute({
    fromChainId: recommendation.fromChain!,
    toChainId: recommendation.toChain!,
    fromAddress: signerAddress,
    fromAmount: amountBaseUnits,
  });
  const executedRoute = await executeServerRoute(route, privateKey);

  const result: AutomationResult = {
    status: "executed",
    mode: "execution",
    timestamp: new Date().toISOString(),
    currentChainId,
    amountUsdc,
    message: decision.message,
    routeId: executedRoute.id,
    reasoning: await reasoningPromise,
    txLinks: executedRoute.steps.flatMap((step) =>
      (step.execution?.process || [])
        .map((process) => process.txLink)
        .filter((link): link is string => Boolean(link)),
    ),
    details: {
      steps: executedRoute.steps.length,
      executionStatus:
        executedRoute.steps.at(-1)?.execution?.status || "PENDING",
      routeCostUsd: decision.analysis?.routeCostUsd,
      projectedAnnualGainUsd: decision.analysis?.projectedAnnualGainUsd,
      projectedNetAnnualGainUsd: decision.analysis?.projectedNetAnnualGainUsd,
      paybackDays: decision.analysis?.paybackDays,
    },
  };
  await persistAutomationRun({ walletAddress, triggerSource, result });
  await maybeSendAlert(storedConfig?.alertWebhookUrl, triggerSource, result);
  await maybeSendTelegramAlert(storedConfig, triggerSource, result);
  return result;
}

async function buildRoute(params: {
  fromChainId: number;
  toChainId: number;
  fromAddress: string;
  fromAmount: string;
}) {
  const fromToken = USDC_ADDRESSES[params.fromChainId];
  const toToken = USDC_ADDRESSES[params.toChainId];

  if (!fromToken || !toToken) {
    throw new Error("USDC is not configured for one of the execution chains.");
  }

  createConfig({
    integrator: "lifi-yield-agent",
  });

  const quote = await getQuote({
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
  });

  return convertQuoteToRoute(quote, {
    adjustZeroOutputFromPreviousStep: true,
  });
}

async function executeServerRoute(
  route: ReturnType<typeof convertQuoteToRoute>,
  privateKey: string,
): Promise<RouteExtended> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const provider = EVM({
    getWalletClient: async () =>
      createServerWalletClient(route.fromChainId, account),
    switchChain: async (chainId: number): Promise<Client | undefined> =>
      createServerWalletClient(chainId, account),
  });

  createConfig({
    integrator: "lifi-yield-agent",
    providers: [provider],
  });

  return executeRoute(route, {
    executeInBackground: false,
  });
}

async function getReviewCommand(
  recommendation: NonNullable<AgentDecision["recommendation"]>,
  amountUsdc: string,
) {
  if (!recommendation.fromChain) {
    return undefined;
  }

  const fromChainName = await getChainName(recommendation.fromChain);
  return `rebalance ${amountUsdc} from ${fromChainName.toLowerCase()}`;
}

function createServerWalletClient(
  chainId: number,
  account: ReturnType<typeof privateKeyToAccount>,
) {
  const { chain, rpcUrl } = getChainConfig(chainId);
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

function parseIntegerEnv(value: string, fallbackValue: number): number {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

async function getReasoningSafe(decision: AgentDecision) {
  try {
    const reasoning = await generateStrategyReasoning(decision);
    if (!reasoning) {
      return undefined;
    }

    return {
      ...reasoning,
      model: serverEnv.geminiModel || "gemini-2.5-flash",
    };
  } catch (error) {
    console.error("Gemini reasoning failed", error);
    return undefined;
  }
}

async function maybeSkipForCooldown(
  walletAddress: string,
  cooldownMinutes: number | null | undefined,
  currentChainId: number,
  amountUsdc: string,
) {
  if (!cooldownMinutes || cooldownMinutes <= 0) {
    return null;
  }

  const lastExecutionTimestamp = await getLastExecutionTimestamp(walletAddress);
  if (!lastExecutionTimestamp) {
    return null;
  }

  const elapsedMs = Date.now() - new Date(lastExecutionTimestamp).getTime();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  if (elapsedMs >= cooldownMs) {
    return null;
  }

  const remainingMinutes = Math.ceil((cooldownMs - elapsedMs) / 60000);
  return {
    status: "skipped",
    mode: "analysis",
    timestamp: new Date().toISOString(),
    currentChainId,
    amountUsdc,
    message: `Cooldown policy active. Next autonomous rebalance window opens in about ${remainingMinutes} minutes.`,
    details: {
      cooldownMinutes,
      remainingMinutes,
      lastExecutionTimestamp,
    },
  } satisfies AutomationResult;
}

async function maybeSendAlert(
  webhookUrl: string | null | undefined,
  triggerSource: "manual" | "cron",
  result: AutomationResult,
) {
  if (!webhookUrl) {
    return;
  }

  if (!["dry_run", "executed", "error"].includes(result.status)) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        source: "lifi-yield-agent",
        triggerSource,
        status: result.status,
        mode: result.mode,
        message: result.message,
        amountUsdc: result.amountUsdc,
        chainId: result.currentChainId,
        routeId: result.routeId,
        txLinks: result.txLinks ?? [],
        reasoning: result.reasoning ?? null,
        details: result.details ?? {},
        timestamp: result.timestamp,
      }),
    });
  } catch (error) {
    console.error("Failed to send automation alert", error);
  }
}

async function maybeSendTelegramAlert(
  config: Awaited<ReturnType<typeof getStoredAgentConfig>>,
  triggerSource: "manual" | "cron",
  result: AutomationResult,
) {
  if (!config?.telegramEnabled || !config.telegramBotToken || !config.telegramChatId) {
    return;
  }

  if (!["dry_run", "executed", "error"].includes(result.status)) {
    return;
  }

  try {
    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      text: formatAutomationTelegramMessage({
        source: triggerSource,
        status: result.status,
        message: result.message,
        amountUsdc: result.amountUsdc,
        currentChainId: result.currentChainId,
        routeId: result.routeId,
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram alert", error);
  }
}

export async function getAutomationReport(walletAddress: string) {
  const runs = await getRecentAutomationRuns(walletAddress, 20);
  const executed = runs.filter((run) => run.status === "executed").length;
  const dryRuns = runs.filter((run) => run.status === "dry_run").length;
  const skipped = runs.filter((run) => run.status === "skipped").length;
  const errors = runs.filter((run) => run.status === "error").length;

  const projectedNetAnnualGainUsd = runs.reduce((total, run) => {
    const value = Number(run.details?.projectedNetAnnualGainUsd ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    sampleSize: runs.length,
    executed,
    dryRuns,
    skipped,
    errors,
    projectedNetAnnualGainUsd: Number(projectedNetAnnualGainUsd.toFixed(2)),
    latestRun: runs[0] ?? null,
  };
}
