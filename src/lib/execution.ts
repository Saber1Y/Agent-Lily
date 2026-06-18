import {
  EVM,
  convertQuoteToRoute,
  createConfig,
  executeRoute,
  getQuote,
  type RouteExtended,
} from "@lifi/sdk";
import type { Client, PublicClient } from "viem";
import { createPublicClient, http } from "viem";

import { YieldAgent } from "./agent";
import {
  DEFAULT_FROM_ADDRESS,
  USDC_ADDRESSES,
  toUsdcBaseUnits,
} from "./lifi";

interface WalletConnectorLike {
  getWalletClient<T>(chainId?: string): T;
  switchNetwork(args: { networkChainId: number | string }): Promise<void>;
}

export interface ExecutableWallet {
  address?: string;
  connector: unknown;
}

export function canExecuteWithWallet(
  wallet: ExecutableWallet | null,
): wallet is ExecutableWallet {
  if (!wallet?.address) {
    return false;
  }

  try {
    getWalletConnector(wallet);
    return true;
  } catch {
    return false;
  }
}

const ERC20_BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const CHAIN_RPC: Record<number, string> = {
  1: "https://eth.drpc.org",
  10: "https://optimism.drpc.org",
  137: "https://polygon.drpc.org",
  42161: "https://arbitrum.drpc.org",
  8453: "https://base.drpc.org",
  43114: "https://avax.drpc.org",
};

export interface BalanceCheck {
  hasBalance: boolean;
  balance: string;
  required: string;
  chainName: string;
}

export async function checkUsdcBalance(
  walletAddress: string,
  chainId: number,
  amount: string,
): Promise<BalanceCheck> {
  const usdcAddress = USDC_ADDRESSES[chainId];
  const rpc = CHAIN_RPC[chainId];

  if (!usdcAddress || !rpc) {
    return {
      hasBalance: false,
      balance: "0",
      required: amount,
      chainName: `Chain ${chainId}`,
    };
  }

  try {
    const client = createPublicClient({
      chain: { id: chainId, name: `Chain ${chainId}`, nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } },
      transport: http(rpc, { timeout: 10000 }),
    });

    const balance = (await client.readContract({
      address: usdcAddress as `0x${string}`,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    })) as bigint;

    const required = BigInt(toUsdcBaseUnits(amount));
    const hasBalance = balance >= required;

    const chainNames: Record<number, string> = {
      1: "Ethereum",
      10: "Optimism",
      137: "Polygon",
      42161: "Arbitrum",
      8453: "Base",
      43114: "Avalanche",
    };

    return {
      hasBalance,
      balance: (Number(balance) / 1e6).toFixed(2),
      required: amount,
      chainName: chainNames[chainId] || `Chain ${chainId}`,
    };
  } catch (error) {
    console.error("Balance check failed:", error);
    return {
      hasBalance: false,
      balance: "error",
      required: amount,
      chainName: `Chain ${chainId}`,
    };
  }
}

interface ExecutionIntent {
  action: "bridge" | "rebalance";
  amount: string;
  fromChainId?: number;
  toChainId?: number;
}

const CHAIN_KEYWORDS = [
  { keyword: "ethereum", chainId: 1 },
  { keyword: "mainnet", chainId: 1 },
  { keyword: "optimism", chainId: 10 },
  { keyword: "polygon", chainId: 137 },
  { keyword: "matic", chainId: 137 },
  { keyword: "arbitrum", chainId: 42161 },
  { keyword: "base", chainId: 8453 },
  { keyword: "avalanche", chainId: 43114 },
  { keyword: "avax", chainId: 43114 },
] as const;

export async function executeFromInput(
  input: string,
  wallet: ExecutableWallet | null,
): Promise<string> {
  if (!wallet?.address) {
    throw new Error("Connect an EVM wallet before executing a route.");
  }

  const intent = parseExecutionIntent(input);
  if (!intent) {
    throw new Error(
      'Execution command not understood. Try "execute bridge 25 usdc from arbitrum to base" or "execute rebalance 25 from arbitrum".',
    );
  }

  if (intent.action === "bridge") {
    if (!intent.fromChainId || !intent.toChainId) {
      throw new Error("Execution needs both source and destination chains.");
    }

    return executeBridge({
      wallet,
      fromChainId: intent.fromChainId,
      toChainId: intent.toChainId,
      amount: intent.amount,
    });
  }

  return executeRebalance({
    wallet,
    amount: intent.amount,
    currentChainId: intent.fromChainId ?? 42161,
  });
}

async function executeBridge(params: {
  wallet: ExecutableWallet;
  fromChainId: number;
  toChainId: number;
  amount: string;
}): Promise<string> {
  const fromToken = USDC_ADDRESSES[params.fromChainId];
  const toToken = USDC_ADDRESSES[params.toChainId];

  if (!fromToken || !toToken) {
    throw new Error("USDC bridging is not configured for one of the selected chains.");
  }

  const balanceCheck = await checkUsdcBalance(
    params.wallet.address!,
    params.fromChainId,
    params.amount,
  );

  if (!balanceCheck.hasBalance) {
    throw new Error(
      `Insufficient USDC balance on ${balanceCheck.chainName}. You have ${balanceCheck.balance} USDC but need ${balanceCheck.required} USDC. Please switch to ${balanceCheck.chainName} network or fund your wallet.`,
    );
  }

  const route = await buildExecutableRoute({
    wallet: params.wallet,
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    amount: params.amount,
  });

  const executedRoute = await executeWithWallet(route, params.wallet);
  return formatExecutionResult(executedRoute, params.wallet.address);
}

async function executeRebalance(params: {
  wallet: ExecutableWallet;
  amount: string;
  currentChainId: number;
}): Promise<string> {
  const agent = new YieldAgent(params.wallet.address || DEFAULT_FROM_ADDRESS, params.currentChainId);
  const decision = await agent.analyze(toUsdcBaseUnits(params.amount));

  if (decision.status === "error") {
    throw new Error(decision.message);
  }

  if (decision.recommendation.action !== "REBALANCE") {
    return `${decision.message}\nNo route executed.`;
  }

  const recommendation = decision.recommendation;

  const balanceCheck = await checkUsdcBalance(
    params.wallet.address!,
    recommendation.fromChain!,
    params.amount,
  );

  if (!balanceCheck.hasBalance) {
    throw new Error(
      `Insufficient USDC balance on ${balanceCheck.chainName}. You have ${balanceCheck.balance} USDC but need ${balanceCheck.required} USDC. Please switch to ${balanceCheck.chainName} network or fund your wallet.`,
    );
  }

  const route = await buildExecutableRoute({
    wallet: params.wallet,
    fromChainId: recommendation.fromChain!,
    toChainId: recommendation.toChain!,
    amount: params.amount,
  });

  const executedRoute = await executeWithWallet(route, params.wallet);
  return formatExecutionResult(executedRoute, params.wallet.address, decision.message);
}

async function buildExecutableRoute(params: {
  wallet: ExecutableWallet;
  fromChainId: number;
  toChainId: number;
  amount: string;
}) {
  createConfig({
    integrator: "lifi-yield-agent",
  });

  const quote = await getQuote({
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken: USDC_ADDRESSES[params.fromChainId],
    toToken: USDC_ADDRESSES[params.toChainId],
    fromAmount: toUsdcBaseUnits(params.amount),
    fromAddress: params.wallet.address || DEFAULT_FROM_ADDRESS,
  });

  return convertQuoteToRoute(quote, {
    adjustZeroOutputFromPreviousStep: true,
  });
}

async function executeWithWallet(route: ReturnType<typeof convertQuoteToRoute>, wallet: ExecutableWallet) {
  const connector = getWalletConnector(wallet);
  const provider = EVM({
    getWalletClient: async () => getWalletClient(connector),
    switchChain: async (chainId: number): Promise<Client | undefined> => {
      await connector.switchNetwork({ networkChainId: chainId });
      return getWalletClient(connector, chainId);
    },
  });

  createConfig({
    integrator: "lifi-yield-agent",
    providers: [provider],
  });

  return executeRoute(route, {
    executeInBackground: false,
  });
}

function getWalletClient(connector: WalletConnectorLike, chainId?: number): Client {
  const client = connector.getWalletClient<Client>(chainId ? String(chainId) : undefined);
  if (!client) {
    throw new Error("Could not get wallet client from the connected wallet.");
  }
  return client;
}

function getWalletConnector(wallet: ExecutableWallet): WalletConnectorLike {
  const connector = wallet.connector;

  if (
    connector &&
    typeof connector === "object" &&
    "getWalletClient" in connector &&
    typeof connector.getWalletClient === "function" &&
    "switchNetwork" in connector &&
    typeof connector.switchNetwork === "function"
  ) {
    return connector as WalletConnectorLike;
  }

  throw new Error("The connected wallet does not expose the EVM methods required for execution.");
}

function formatExecutionResult(
  route: RouteExtended,
  walletAddress?: string,
  preface?: string,
): string {
  const lines: string[] = [];
  if (preface) {
    lines.push(preface, "");
  }

  lines.push(`Execution status: ${route.steps.every((step) => step.execution?.status === "DONE") ? "DONE" : route.steps.at(-1)?.execution?.status || "PENDING"}`);
  if (walletAddress) {
    lines.push(`Wallet: ${walletAddress}`);
  }

  for (const step of route.steps) {
    lines.push(
      `${step.action.fromChainId} -> ${step.action.toChainId} via ${step.toolDetails?.name || step.tool}: ${step.execution?.status || "PENDING"}`,
    );
    const processLinks = step.execution?.process
      .map((process) => process.txLink)
      .filter((link): link is string => Boolean(link));
    if (processLinks?.length) {
      lines.push(...processLinks.map((link) => `Tx: ${link}`));
    }
  }

  const lastStep = route.steps.at(-1);
  if (lastStep?.estimate?.toAmount) {
    lines.push(
      `Estimated received: ${(Number(lastStep.estimate.toAmount) / 1e6).toFixed(4)} ${lastStep.action.toToken.symbol}`,
    );
  }

  return lines.join("\n");
}

function parseExecutionIntent(input: string): ExecutionIntent | null {
  const normalized = input.toLowerCase();
  if (!normalized.includes("execute")) {
    return null;
  }

  const amount = extractAmount(normalized) ?? "100";
  const chains = extractChains(normalized);

  if (normalized.includes("bridge") || normalized.includes("swap")) {
    return {
      action: "bridge",
      amount,
      fromChainId: chains[0],
      toChainId: chains[1],
    };
  }

  if (normalized.includes("rebalance")) {
    return {
      action: "rebalance",
      amount,
      fromChainId: chains[0],
    };
  }

  return null;
}

function extractAmount(input: string): string | null {
  const match = input.match(/(\d+(?:\.\d+)?)/);
  return match?.[1] ?? null;
}

function extractChains(input: string): number[] {
  const fromToMatch = input.match(
    /\bfrom\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$)/i,
  );

  if (fromToMatch) {
    const fromChain = resolveChainAlias(fromToMatch[1]);
    const toChain = resolveChainAlias(fromToMatch[2]);
    if (fromChain && toChain) {
      return [fromChain, toChain];
    }
  }

  const mentions = CHAIN_KEYWORDS.flatMap(({ keyword, chainId }) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");
    return [...input.matchAll(pattern)].map((match) => ({
      chainId,
      index: match.index ?? Number.MAX_SAFE_INTEGER,
    }));
  }).sort((a, b) => a.index - b.index);

  const orderedChainIds: number[] = [];
  for (const mention of mentions) {
    if (!orderedChainIds.includes(mention.chainId)) {
      orderedChainIds.push(mention.chainId);
    }
  }
  return orderedChainIds;
}

function resolveChainAlias(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  const match = CHAIN_KEYWORDS.find(({ keyword }) => normalized.includes(keyword));
  return match?.chainId ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
