export interface YieldData {
  chainId: number;
  chainName: string;
  symbol: string;
  supplyApr: number;
  liquidity: number;
}

export interface ChainYieldMap {
  [chainId: number]: YieldData;
}

export async function fetchYields(): Promise<ChainYieldMap> {
  throw new Error('NEEDS AAVE API KEY - Visit https://aavescan.com to get free API key');
}

export function findBestYield(yields: ChainYieldMap, currentChainId: number): {
  shouldRebalance: boolean;
  fromChain: number;
  toChain: number;
  fromYield: number;
  toYield: number;
  difference: number;
} | null {
  throw new Error('fetchYields must work first');
}
