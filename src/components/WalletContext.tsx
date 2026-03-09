"use client";

import { createContext, useContext } from "react";
import type { Wallet } from "@dynamic-labs/wallet-connector-core";

export interface WalletContextValue {
  environmentId: string;
  primaryWallet: Wallet | null;
  network: number | string | undefined;
  setShowAuthFlow: ((open: boolean) => void) | null;
}

const WalletContext = createContext<WalletContextValue>({
  environmentId: "",
  primaryWallet: null,
  network: undefined,
  setShowAuthFlow: null,
});

export function WalletContextProvider({
  value,
  children,
}: {
  value: WalletContextValue;
  children: React.ReactNode;
}) {
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  return useContext(WalletContext);
}
