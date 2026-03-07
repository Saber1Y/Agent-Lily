import { YieldAgent } from "./agent";
import {
  DEFAULT_FROM_ADDRESS,
  getChainsInfo,
  getFormattedBridgeQuote,
  getSupportedChains,
  toUsdcBaseUnits,
} from "./lifi";
import { fetchYields } from "./yields";

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

const DEFAULT_CHAIN_ID = 42161;
const DEFAULT_AMOUNT = "100";

interface ChatResponseOptions {
  walletAddress?: string;
}

export async function getChatResponse(
  input: string,
  options: ChatResponseOptions = {},
): Promise<string> {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("chains") || lowerInput.includes("supported")) {
    return getChainsInfo();
  }

  if (lowerInput.includes("bridge") || lowerInput.includes("swap")) {
    return handleBridgeRequest(lowerInput, options.walletAddress);
  }

  if (lowerInput.includes("rebalance")) {
    return handleRebalanceRequest(lowerInput, options.walletAddress);
  }

  if (
    lowerInput.includes("aave") ||
    lowerInput.includes("yield") ||
    lowerInput.includes("apy") ||
    lowerInput.includes("rates")
  ) {
    return handleYieldRequest();
  }

  return [
    "Commands you can try:",
    `- "check yields"`,
    `- "rebalance from arbitrum"`,
    `- "bridge 250 usdc from optimism to base"`,
    `- "supported chains"`,
  ].join("\n");
}

async function handleYieldRequest(): Promise<string> {
  const yields = Object.values(await fetchYields()).sort(
    (a, b) => b.supplyApr - a.supplyApr,
  );

  if (!yields.length) {
    throw new Error("No Aave markets returned yield data.");
  }

  return [
    "Aave USDC yields",
    "",
    ...yields.map((yieldItem, index) => {
      const prefix = index === 0 ? "* " : "- ";
      return `${prefix}${yieldItem.chainName}: ${yieldItem.supplyApr.toFixed(2)}% APR, $${yieldItem.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })} liquidity`;
    }),
  ].join("\n");
}

async function handleRebalanceRequest(
  input: string,
  walletAddress?: string,
): Promise<string> {
  const currentChain = extractFirstChain(input) ?? DEFAULT_CHAIN_ID;
  const amount = extractAmount(input) ?? DEFAULT_AMOUNT;
  const amountInBaseUnits = toUsdcBaseUnits(amount);
  const agent = new YieldAgent(walletAddress || DEFAULT_FROM_ADDRESS, currentChain);
  const decision = await agent.analyze(amountInBaseUnits);

  if (decision.status === "error") {
    throw new Error(decision.message);
  }

  const lines = [`Rebalance analysis for ${amount} USDC`, "", decision.message];

  if (decision.recommendation.action === "REBALANCE") {
    const quote = decision.recommendation.quote;
    if (decision.analysis) {
      lines.push(
        "",
        "Why this move",
        `Yield spread: ${(decision.analysis.targetYield ?? 0).toFixed(2)}% vs ${(decision.analysis.currentYield ?? 0).toFixed(2)}%`,
      );
      if (decision.analysis.routeCostUsd !== undefined) {
        lines.push(`Route cost: ~$${decision.analysis.routeCostUsd.toFixed(2)}`);
      }
      if (decision.analysis.projectedNetAnnualGainUsd !== undefined) {
        lines.push(
          `Projected net annual gain: ~$${decision.analysis.projectedNetAnnualGainUsd.toFixed(2)}`,
        );
      }
      if (decision.analysis.paybackDays) {
        lines.push(
          `Estimated payback period: ${Math.ceil(decision.analysis.paybackDays)} days`,
        );
      }
    }
    if (quote) {
      lines.push("");
      lines.push(
        `Route: ${quote.fromChainId} -> ${quote.toChainId} via ${quote.toolDetails || quote.tool}`,
        `Estimated received: ${(Number(quote.toAmount) / 1e6).toFixed(4)} ${quote.toTokenSymbol}`,
      );
      if (quote.gasCostUSD) {
        lines.push(`Estimated gas: $${Number(quote.gasCostUSD).toFixed(2)}`);
      }
    } else {
      lines.push("A rebalance target was found, but the LI.FI route quote was not returned.");
    }
  } else {
    lines.push("Action: hold current position.");
    if (decision.analysis?.blockedReason) {
      lines.push(`Policy reason: ${decision.analysis.blockedReason}`);
    }
  }

  lines.push(
    walletAddress
      ? "Quote generated using your connected wallet address. You can execute this route from the chat UI."
      : "Quote generated in preview mode. Connect a wallet, then use Execute in the chat UI.",
  );
  return lines.join("\n");
}

async function handleBridgeRequest(
  input: string,
  walletAddress?: string,
): Promise<string> {
  const chainIds = extractChains(input);
  if (chainIds.length < 2) {
    const supportedChains = await getSupportedChains();
    return `Specify both source and destination chains, for example: "bridge 100 usdc from arbitrum to base". Supported chain ids: ${supportedChains.join(", ")}`;
  }

  const amount = extractAmount(input) ?? DEFAULT_AMOUNT;

  return getFormattedBridgeQuote({
    fromChainId: chainIds[0],
    toChainId: chainIds[1],
    amount,
    fromAddress: walletAddress,
  });
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

function extractFirstChain(input: string): number | null {
  return extractChains(input)[0] ?? null;
}

function resolveChainAlias(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  const match = CHAIN_KEYWORDS.find(({ keyword }) => normalized.includes(keyword));
  return match?.chainId ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
