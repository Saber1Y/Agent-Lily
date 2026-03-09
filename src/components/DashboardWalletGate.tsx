"use client";

import { clientEnv } from "@/env/client";
import { useWalletContext } from "./WalletContext";
import { ConnectWallet } from "./ConnectWallet";

export function DashboardWalletGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const environmentId = clientEnv.dynamicEnvironmentId;

  if (!environmentId) {
    return (
      <WalletGateCard
        title="Wallet connection is required"
        description="Set NEXT_PUBLIC_DYNAMIC_ENV_ID to enable dashboard access and require users to connect a wallet."
      />
    );
  }

  return <ConnectedWalletGate>{children}</ConnectedWalletGate>;
}

function ConnectedWalletGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { primaryWallet } = useWalletContext();

  if (!primaryWallet?.address) {
    return (
      <WalletGateCard
        title="Connect wallet to use the dashboard"
        description="All dashboard workspaces require a connected wallet before Lily can analyze routes, prepare actions, or execute anything on your behalf."
        action={<ConnectWallet />}
      />
    );
  }

  return <>{children}</>;
}

function WalletGateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-3xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-[32px] border border-[#262633] bg-[linear-gradient(180deg,rgba(20,20,28,0.96),rgba(13,13,18,0.96))] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <div className="mx-auto mb-4 h-3 w-3 rounded-full bg-[#fab6f5]" />
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8F90A6]">
          {description}
        </p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
