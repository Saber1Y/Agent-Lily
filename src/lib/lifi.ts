import { getQuote, createConfig, getChains, ChainType } from "@lifi/sdk";

export const USDC_ADDRESSES: { [chainId: number]: string } = {
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d997Ff932",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  1151111081099710: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

let cachedChains: any[] | null = null;
export async function fetchSupportedChains() {
  if (cachedChains) return cachedChains;

  createConfig({
    integrator: "demoagent",
  });

  const chains = await getChains();
  cachedChains = chains;
  return chains;
}

export async function getChainsInfo(): Promise<string> {
  const chains = await fetchSupportedChains();
  
  let response = `🔗 LI.FI Supported Chains (${chains.length}):\n\n`;
  
  chains.slice(0, 20).forEach((chain: any) => {
    response += `• ${chain.name} (ID: ${chain.id}) - ${chain.coin}\n`;
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
  fromAddress: string;
}) {
  throw new Error(
    "NEEDS LI.FI API KEY - Get at https://li free key.fi or use valid wallet address",
  );
}
export async function getFormattedBridgeQuote(params: {
  fromChainId: number;
  toChainId: number;
  amount: string;
  fromAddress: string;
}): Promise<string> {
  throw new Error("LI.FI quote requires valid API setup");
}
export async function getSupportedChains() {
  const chains = await fetchSupportedChains();
  return chains
    .filter((c: any) => c.id in USDC_ADDRESSES)
    .map((c: any) => c.id);
}
const CHAIN_NAMES_FALLBACK: { [id: number]: string } = {
  1: "Ethereum",
  10: "Optimism",
  42161: "Arbitrum One",
  8453: "Base",
  137: "Polygon",
  56: "BNB Chain",
  43114: "Avalanche C-Chain",
  1151111081099710: "Solana",
};
export async function getChainName(chainId: number): Promise<string> {
  return CHAIN_NAMES_FALLBACK[chainId] || `Chain ${chainId}`;
}

export async function getAllChains() {
  try {
    const chains = await getChains({ chainTypes: [ChainType.EVM] });
    console.log(chains);
  } catch (error) {
    console.error(error);
  }
}
