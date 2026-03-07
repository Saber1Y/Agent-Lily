'use client';

import { ConnectWalletEnabled } from './ConnectWalletEnabled';

export function ConnectWallet() {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;

  if (!environmentId) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-full bg-[#2A2A35] text-[#A0A0B0] font-semibold text-sm cursor-not-allowed"
        title="Set NEXT_PUBLIC_DYNAMIC_ENV_ID to enable wallet connections"
      >
        Wallet Disabled
      </button>
    );
  }

  return <ConnectWalletEnabled />;
}
