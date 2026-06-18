"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import {
  ActionButton,
  EmptyState,
  SectionCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { useDashboardFeed } from "@/components/dashboard/useDashboardFeed";
import { useWalletContext } from "@/components/WalletContext";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  42161: "Arbitrum",
  8453: "Base",
  84532: "Base Sepolia",
  43114: "Avalanche",
};

const ALL_CHAINS = [1, 10, 137, 42161, 8453, 84532, 43114];

export default function DashboardApprovalsPage() {
  const { runs, isLoading, refresh } = useDashboardFeed();
  const { primaryWallet } = useWalletContext();
  const [signing, setSigning] = useState(false);
  const [t3nStatus, setT3nStatus] = useState<{
    configured: boolean;
    authorized: boolean;
    operatorAddress: string | null;
    maxAmount: string | null;
    expiresAt: string | null;
  } | null>(null);
  const [authResult, setAuthResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkT3nStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/t3n/status");
      const data = await res.json();
      setT3nStatus({
        configured: data.configured,
        authorized: data.authorized,
        operatorAddress: data.authorization?.signerAddress || null,
        maxAmount: data.authorization?.maxAmountPerBridge || null,
        expiresAt: data.authorization?.expiresAt || null,
      });
    } catch {
      setT3nStatus(null);
    }
  }, []);

  const handleSignAuthorization = useCallback(async () => {
    if (!primaryWallet?.connector) {
      setError("Connect your wallet first.");
      return;
    }

    setSigning(true);
    setError(null);
    setAuthResult(null);

    try {
      const walletClient = await (primaryWallet.connector as any).getWalletClient?.();
      if (!walletClient?.account?.address) {
        throw new Error("Could not get wallet address. Make sure your wallet is connected.");
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 7 * 86400;
      const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
      const nonce = Array.from(nonceBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const authorization = {
        version: "lily-bridge-auth-v1",
        agentDid: "",
        operatorAddress: walletClient.account.address,
        issuedAt: now,
        expiresAt: now + expiresIn,
        maxAmountPerBridge: "100",
        allowedSourceChains: [84532],
        allowedDestinationChains: [84532, 8453, 137, 42161, 10, 1, 43114],
        nonce,
      };

      const message = JSON.stringify(authorization);
      const signature = await walletClient.signMessage({
        account: walletClient.account,
        message,
      });

      const res = await fetch("/api/t3n/authorize/signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorization, signature }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setAuthResult(data.stored ? null : data.envVarValue);
      await checkT3nStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign authorization.");
    } finally {
      setSigning(false);
    }
  }, [primaryWallet, checkT3nStatus]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }, []);

  const approvalItems = runs.filter((run) => run.status === "dry_run");

  return (
    <DashboardShell
      currentPage="approvals"
      title="Approval Inbox"
      subtitle="Review Lily's recommendations and manage T3N bridge authorization."
      actions={
        <ActionButton onClick={() => refresh()} disabled={isLoading} variant="secondary">
          Refresh
        </ActionButton>
      }
    >
      <SectionCard
        title="T3N Bridge Authorization"
        subtitle="Sign a bridge authorization with your wallet so Lily can execute autonomous rebalances."
      >
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#262633] bg-[#101018] p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold leading-6 text-white">
                  {t3nStatus?.configured
                    ? `Authorized: ${t3nStatus.authorized ? "✅" : "❌"}`
                    : "T3N not configured"}
                </div>
                <div className="text-xs text-[#707083]">
                  {t3nStatus?.configured
                    ? t3nStatus.authorized
                      ? `Signed by ${t3nStatus.operatorAddress?.slice(0, 6)}...${t3nStatus.operatorAddress?.slice(-4)}, max ${t3nStatus.maxAmount} USDC`
                      : "No active bridge authorization. Sign one below."
                    : "Set T3N_AGENT_API_KEY and T3N_AGENT_DID in .env.local to configure."}
                </div>
              </div>
              <ActionButton
                onClick={checkT3nStatus}
                variant="secondary"
                disabled={isLoading}
              >
                Refresh Status
              </ActionButton>
            </div>
          </div>

          {t3nStatus?.configured && (
            <div className="rounded-[24px] border border-[#262633] bg-[#101018] p-6">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-white">
                  Sign a New Authorization
                </div>
                <div className="text-xs text-[#707083]">
                  Your wallet will prompt you to sign a message. This proves you authorize
                  Lily to bridge up to 100 USDC from Base Sepolia to any supported chain.
                  Authorization expires in 7 days.
                </div>

                {error && (
                  <div className="rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {(authResult || (t3nStatus?.authorized && error === null)) && (
                  <div className="rounded-xl bg-[#1a1a2e] border border-[#262633] p-4">
                    <div className="mb-2 text-sm font-semibold text-[#fab6f5]">
                      Authorization Signed ✅
                    </div>
                    <div className="mb-3 text-xs text-[#707083]">
                      {authResult
                        ? "Register your agent on the dashboard first. For now, add this to .env.local:"
                        : "Bridge authorization saved to your agent config. No restart needed."}
                    </div>
                    {authResult && (
                      <div className="relative">
                        <pre className="max-h-40 overflow-auto rounded-xl bg-black/50 p-3 text-xs text-[#c0c0d0] break-all">
                          {authResult}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(authResult)}
                          className="mt-2 rounded-lg bg-[#262633] px-3 py-1.5 text-xs text-[#c0c0d0] hover:bg-[#323242]"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <ActionButton
                  onClick={handleSignAuthorization}
                  disabled={signing || !primaryWallet}
                >
                  {signing
                    ? "Signing..."
                    : primaryWallet
                      ? "✍️ Sign Authorization with Wallet"
                      : "Connect Wallet First"}
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Pending Recommendations"
        subtitle="These are dry-run opportunities that Lily flagged as worth reviewing."
      >
        <div className="space-y-4">
          {approvalItems.length ? (
            approvalItems.map((run) => (
              <div
                key={run.id}
                className="rounded-[24px] border border-[#262633] bg-[#101018] p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold leading-6 text-white">{run.message}</div>
                    <div className="mt-2 text-xs text-[#707083]">
                      {new Date(run.createdAt).toLocaleString()} • {run.triggerSource}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill tone="accent">Needs review</StatusPill>
                    {typeof run.details?.reviewCommand === "string" ? (
                      <Link
                        href={`/dashboard/chat?command=${encodeURIComponent(run.details.reviewCommand)}`}
                        className="rounded-xl bg-[#fab6f5] px-3 py-2 text-sm font-semibold text-black"
                      >
                        Review in Chat
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState text="No approval items yet. Trigger a dry-run or wait for the next cron recommendation." />
          )}
        </div>
      </SectionCard>
    </DashboardShell>
  );
}
