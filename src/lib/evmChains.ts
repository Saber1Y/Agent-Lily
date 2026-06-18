import type { Address, Chain } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";

export const EVM_CHAINS: Record<
  number,
  {
    chain: Chain;
    rpcUrl: string;
  }
> = {
  1: {
    chain: mainnet,
    rpcUrl: "https://eth.llamarpc.com",
  },
  10: {
    chain: optimism,
    rpcUrl: "https://mainnet.optimism.io",
  },
  137: {
    chain: polygon,
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
  },
  8453: {
    chain: base,
    rpcUrl: "https://base-rpc.publicnode.com",
  },
  84532: {
    chain: baseSepolia,
    rpcUrl: "https://sepolia.base.org",
  },
  42161: {
    chain: arbitrum,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  43114: {
    chain: avalanche,
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
  },
};

export function getChainConfig(chainId: number): {
  chain: Chain;
  rpcUrl: string;
} {
  const config = EVM_CHAINS[chainId];

  if (!config) {
    throw new Error(`Unsupported EVM chain for execution: ${chainId}`);
  }

  return config;
}

export function isHexAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
