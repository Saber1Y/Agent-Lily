import { getQuote, createConfig, executeRoute, getChains, getToken, getTokens } from '@lifi/sdk';

export const USDC_ADDRESSES: { [chainId: number]: string } = {
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d997Ff932',
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
};

let cachedChains: any[] | null = null;

export async function fetchSupportedChains() {
  if (cachedChains) return cachedChains;
  
  createConfig({
    integrator: 'lifi-yield-agent',
  });
  
  const chains = await getChains();
  cachedChains = chains;
  return chains;
}

export async function fetchChainById(chainId: number) {
  const chains = await fetchSupportedChains();
  return chains.find((c: any) => c.id === chainId);
}

export async function fetchChainByName(name: string) {
  const chains = await fetchSupportedChains();
  return chains.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
}

export async function getCrossChainQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}) {
  createConfig({
    integrator: 'lifi-yield-agent',
  });

  const quote = await getQuote({
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    slippage: 0.005,
  });

  return quote;
}

export async function getBridgeQuote(params: {
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  fromAddress: string;
}) {
  const fromToken = USDC_ADDRESSES[params.fromChainId];
  const toToken = USDC_ADDRESSES[params.toChainId];

  if (!fromToken || !toToken) {
    throw new Error('Unsupported chain pair');
  }

  createConfig({
    integrator: 'lifi-yield-agent',
  });

  const quote = await getQuote({
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    slippage: 0.01,
  });

  return quote;
}

export async function getSupportedChains() {
  const chains = await fetchSupportedChains();
  return chains.filter((c: any) => c.id in USDC_ADDRESSES).map((c: any) => c.id);
}

const CHAIN_NAMES_FALLBACK: { [id: number]: string } = {
  1: 'Ethereum',
  10: 'Optimism',
  42161: 'Arbitrum One',
  8453: 'Base',
  137: 'Polygon',
  56: 'BNB Chain',
  43114: 'Avalanche C-Chain',
};

let chainNamesCache: { [id: number]: string } = {};

export async function getChainName(chainId: number): Promise<string> {
  if (chainNamesCache[chainId]) {
    return chainNamesCache[chainId];
  }
  
  try {
    const chain = await fetchChainById(chainId);
    if (chain?.name) {
      chainNamesCache[chainId] = chain.name;
      return chain.name;
    }
  } catch (e) {
    console.log('Using fallback chain name');
  }
  
  return CHAIN_NAMES_FALLBACK[chainId] || `Chain ${chainId}`;
}

export async function getAllChainNames(): Promise<{ [id: number]: string }> {
  const chains = await fetchSupportedChains();
  const result: { [id: number]: string } = {};
  for (const chain of chains) {
    if (chain.id in USDC_ADDRESSES) {
      result[chain.id] = chain.name;
    }
  }
  return result;
}
