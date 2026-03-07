import {
  createConfig,
  getChains,
  getQuote,
  ChainType,
} from "@lifi/sdk";

export const DEFAULT_FROM_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export const USDC_ADDRESSES: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
};

interface LifiChain {
  id: number;
  name: string;
  coin: string;
}

export interface BridgeQuote {
  id: string;
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD?: string;
  toAmountUSD?: string;
  executionDuration?: number;
  gasCostUSD?: string;
  toolDetails?: string;
}

let isConfigured = false;
let cachedChains: LifiChain[] | null = null;

function ensureConfig() {
  if (!isConfigured) {
    createConfig({
      integrator: "lifi-yield-agent",
    });
    isConfigured = true;
  }
}

export async function fetchSupportedChains(): Promise<LifiChain[]> {
  if (cachedChains) {
    return cachedChains;
  }

  ensureConfig();
  const chains = await getChains();
  cachedChains = chains.map((chain) => ({
    id: chain.id,
    name: chain.name,
    coin: chain.coin,
  }));
  return cachedChains;
}

export async function getChainsInfo(): Promise<string> {
  const chains = await fetchSupportedChains();
  let response = `LI.FI Supported Chains (${chains.length})\n\n`;

  chains.slice(0, 20).forEach((chain) => {
    response += `- ${chain.name} (ID: ${chain.id}) - ${chain.coin}\n`;
  });

  if (chains.length > 20) {
    response += `\n...and ${chains.length - 20} more chains`;
  }

  return response;
}

export async function getBridgeQuote(params: {
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  fromAddress?: string;
}): Promise<BridgeQuote> {
  ensureConfig();

  const fromToken = USDC_ADDRESSES[params.fromChainId];
  const toToken = USDC_ADDRESSES[params.toChainId];

  if (!fromToken || !toToken) {
    throw new Error("USDC bridging is not configured for one of the selected chains.");
  }

  const quote = await getQuote({
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress || DEFAULT_FROM_ADDRESS,
  });

  return {
    id: quote.id,
    tool: quote.tool,
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromTokenSymbol: quote.action.fromToken.symbol,
    toTokenSymbol: quote.action.toToken.symbol,
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    fromAmountUSD: quote.estimate.fromAmountUSD,
    toAmountUSD: quote.estimate.toAmountUSD,
    executionDuration: quote.estimate.executionDuration,
    gasCostUSD: quote.estimate.gasCosts?.[0]?.amountUSD,
    toolDetails: quote.toolDetails?.name,
  };
}

export async function getFormattedBridgeQuote(params: {
  fromChainId: number;
  toChainId: number;
  amount: string;
  fromAddress?: string;
}): Promise<string> {
  const fromAmount = toUsdcBaseUnits(params.amount);
  const quote = await getBridgeQuote({
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromAmount,
    fromAddress: params.fromAddress,
  });
  const fromChainName = await getChainName(params.fromChainId);
  const toChainName = await getChainName(params.toChainId);

  return [
    `Bridge quote via ${quote.toolDetails || quote.tool}`,
    `${params.amount} USDC from ${fromChainName} to ${toChainName}`,
    `Estimated received: ${(Number(quote.toAmount) / 1e6).toFixed(4)} ${quote.toTokenSymbol}`,
    quote.toAmountUSD ? `Estimated value: $${Number(quote.toAmountUSD).toFixed(2)}` : null,
    quote.gasCostUSD ? `Estimated gas: $${Number(quote.gasCostUSD).toFixed(2)}` : null,
    quote.executionDuration
      ? `Estimated duration: ${Math.round(quote.executionDuration / 60)} min`
      : null,
    `Route id: ${quote.id}`,
    params.fromAddress && params.fromAddress !== DEFAULT_FROM_ADDRESS
      ? "Using connected wallet address for quote."
      : "Using a placeholder wallet for quote preview.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getSupportedChains() {
  const chains = await fetchSupportedChains();
  return chains.filter((chain) => chain.id in USDC_ADDRESSES).map((chain) => chain.id);
}

const CHAIN_NAMES_FALLBACK: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  42161: "Arbitrum",
  8453: "Base",
  43114: "Avalanche",
};

export async function getChainName(chainId: number): Promise<string> {
  const chains = cachedChains || (await fetchSupportedChains());
  return chains.find((chain) => chain.id === chainId)?.name || CHAIN_NAMES_FALLBACK[chainId] || `Chain ${chainId}`;
}

export async function getAllChains() {
  ensureConfig();
  const chains = await getChains({ chainTypes: [ChainType.EVM] });
  console.log(chains);
}

export function toUsdcBaseUnits(amount: string): string {
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  return Math.round(normalized * 1e6).toString();
}
