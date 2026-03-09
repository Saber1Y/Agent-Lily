'use client';

import { useEffect } from 'react';
import type { Wallet } from '@dynamic-labs/wallet-connector-core';
import { useWalletContext } from './WalletContext';

interface WalletAddressSyncProps {
  onChange: (payload: { address?: string; wallet: Wallet | null; chainId?: number }) => void;
}

export function WalletAddressSync({ onChange }: WalletAddressSyncProps) {
  const { primaryWallet, network } = useWalletContext();

  useEffect(() => {
    let chainId: number | undefined;
    
    if (network) {
      chainId = typeof network === 'number' ? network : Number(network);
    }
    
    onChange({
      address: primaryWallet?.address,
      wallet: primaryWallet,
      chainId,
    });
  }, [onChange, primaryWallet, network]);

  return null;
}
