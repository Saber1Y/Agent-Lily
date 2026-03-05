import { createPublicClient, http, parseUnits } from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, avalanche } from 'viem/chains';

const AAVE_POOL_ADDRESSES: Record<number, string> = {
  1: '0x87870Bca3F3fD6335C3F4c8392D7C5d7f9d6d5c', // Ethereum
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Optimism
  137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Polygon
  8453: '0xA238Dd80C259a72e5d6439050Da9e4C3A9A5aD6f', // Base
  43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Avalanche
};

const USDC_ABI = [
  {
    name: 'getReserveData',
    type: 'function',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'underlyingAsset', type: 'address' },
      { name: 'aTokenAddress', type: 'address' },
      { name: 'stableDebtTokenAddress', type: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address' },
      { name: 'interestRateStrategyAddress', type: 'address' },
      { name: 'accruedToTreasury', type: 'uint256' },
      { name: 'totalAToken', type: 'uint256' },
      { name: 'totalStableDebt', type: 'uint256' },
      { name: 'totalVariableDebt', type: 'uint256' },
      { name: 'liquidityRate', type: 'uint256' },
      { name: 'variableBorrowRate', type: 'uint256' },
      { name: 'stableBorrowRate', type: 'uint256' },
      { name: 'lastUpdateTimestamp', type: 'uint256' },
      { name: 'ltv', type: 'uint16' },
      { name: 'liquidationThreshold', type: 'uint16' },
      { name: 'liquidationBonus', type: 'uint16' },
      { name: 'decimals', type: 'uint16' },
    ],
    stateMutability: 'view',
  },
];

const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d997Ff932',
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
};

const PUBLIC_RPCS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
  8453: 'https://base-rpc.publicnode.com',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
};

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  43114: 'Avalanche',
};

interface YieldResult {
  chainId: number;
  chainName: string;
  supplyRate: number;
}

export async function fetchAaveYields(): Promise<YieldResult[]> {
  const results: YieldResult[] = [];

  for (const [chainId, poolAddress] of Object.entries(AAVE_POOL_ADDRESSES)) {
    const chain = parseInt(chainId);
    const usdcAddress = USDC_ADDRESSES[chain];
    const rpc = PUBLIC_RPCS[chain];

    if (!usdcAddress || !rpc) continue;

    try {
      const client = createPublicClient({
        chain: { id: chain, name: CHAIN_NAMES[chain], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } },
        transport: http(rpc),
      });

      const data = await client.readContract({
        address: poolAddress as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'getReserveData',
        args: [usdcAddress as `0x${string}`],
      }) as any;

      // liquidityRate is in ray (27 decimals), convert to APY
      const rate = data[9] as bigint;
      const apy = Number(rate) * 365 * 24 * 60 * 60 / 1e27;

      results.push({
        chainId: chain,
        chainName: CHAIN_NAMES[chain],
        supplyRate: apy * 100, // Convert to percentage
      });
    } catch (error) {
      console.error(`Error fetching ${CHAIN_NAMES[chain]}:`, error);
    }
  }

  return results;
}
