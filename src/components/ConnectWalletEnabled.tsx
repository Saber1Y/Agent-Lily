'use client';

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useWalletContext } from './WalletContext';

export function ConnectWalletEnabled() {
  const { setShowAuthFlow, primaryWallet } = useWalletContext();
  const { handleLogOut } = useDynamicContext();

  if (primaryWallet) {
    const address = primaryWallet.address;
    return (
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 rounded-full bg-[#fab6f5] text-black font-semibold text-sm hover:opacity-90 transition">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </button>
        <button
          onClick={() => handleLogOut()}
          className="px-3 py-2 rounded-full border border-[#262633] text-[#707083] text-xs hover:text-white hover:border-[#fab6f5] transition"
          title="Disconnect"
        >
          ✕
        </button>
      </div>
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
