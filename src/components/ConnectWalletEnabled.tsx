'use client';

import { useWalletContext } from './WalletContext';

export function ConnectWalletEnabled() {
  const { setShowAuthFlow, primaryWallet } = useWalletContext();

  if (primaryWallet) {
    const address = primaryWallet.address;
    return (
      <button className="px-4 py-2 rounded-full bg-[#fab6f5] text-black font-semibold text-sm hover:opacity-90 transition">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowAuthFlow?.(true)}
      className="px-4 py-2 rounded-full bg-[#fab6f5] text-black font-semibold text-sm hover:opacity-90 transition"
    >
      Connect Wallet
    </button>
  );
}
