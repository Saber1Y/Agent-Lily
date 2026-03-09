'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { ReactNode } from 'react';
import { clientEnv } from '@/env/client';
import { WalletContextProvider } from './WalletContext';

export function Providers({ children }: { children: ReactNode }) {
  const environmentId = clientEnv.dynamicEnvironmentId;

  if (!environmentId) {
    return (
      <WalletContextProvider
        value={{
          environmentId: "",
          primaryWallet: null,
          network: undefined,
          setShowAuthFlow: null,
        }}
      >
        {children}
      </WalletContextProvider>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
        ],
      }}
    >
      <DynamicWalletBridge environmentId={environmentId}>
        {children}
      </DynamicWalletBridge>
    </DynamicContextProvider>
  );
}

function DynamicWalletBridge({
  children,
  environmentId,
}: {
  children: ReactNode;
  environmentId: string;
}) {
  const { primaryWallet, network, setShowAuthFlow } = useDynamicContext();

  return (
    <WalletContextProvider
      value={{
        environmentId,
        primaryWallet,
        network,
        setShowAuthFlow,
      }}
    >
      {children}
    </WalletContextProvider>
  );
}
