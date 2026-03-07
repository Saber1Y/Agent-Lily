"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/DashboardShell";
import {
  ActionButton,
  SectionCard,
  TextField,
} from "@/components/dashboard/ui";
import { useAgentOps } from "@/components/dashboard/useAgentOps";

export default function DashboardPoliciesPage() {
  const { opsSecret, setOpsSecret, opsConfig, setOpsConfig, saveConfig, isLoading } =
    useAgentOps();
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [cliTokenExpiry, setCliTokenExpiry] = useState<string | null>(null);

  async function generateCliToken() {
    if (!opsSecret.trim()) {
      toast.error("Enter agent admin token first.");
      return;
    }

    const response = await fetch("/api/agent/cli-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opsSecret}`,
      },
    });
    const json = await response.json();

    if (!response.ok) {
      toast.error("Failed to generate CLI token.", {
        description: json.message || "Unknown error occurred.",
      });
      return;
    }

    setCliToken(json.token);
    setCliTokenExpiry(json.expiresAt);
    try {
      await navigator.clipboard.writeText(`lily auth token ${json.token}`);
      toast.success("CLI token copied.", {
        description: "Paste it into your terminal to authenticate Lily CLI.",
      });
    } catch {
      toast.success("CLI token generated.", {
        description: "Copy the auth command shown below into your terminal.",
      });
    }
  }

  return (
    <DashboardShell
      currentPage="policies"
      title="Risk Policies"
      subtitle="Make Lily optimize net return and stay inside your chain, cost, and cooldown rules."
      actions={
        <ActionButton onClick={saveConfig} disabled={isLoading}>
          Save Policies
        </ActionButton>
      }
    >
      <SectionCard
        title="Risk Policy Controls"
        subtitle="This is the operator-grade layer that makes Lily feel deliberate rather than APY-maxi."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Agent Admin Token"
            type="password"
            value={opsSecret}
            onChange={setOpsSecret}
            placeholder="AGENT_API_SECRET or CRON_SECRET"
          />
          <TextField
            label="Current Chain ID"
            value={String(opsConfig.currentChainId)}
            onChange={(value) =>
              setOpsConfig((prev) => ({
                ...prev,
                currentChainId: Number(value) || 42161,
              }))
            }
          />
          <TextField
            label="Position USDC"
            value={opsConfig.positionUsdc}
            onChange={(value) => setOpsConfig((prev) => ({ ...prev, positionUsdc: value }))}
          />
          <TextField
            label="Min Yield Delta %"
            value={String(opsConfig.minYieldDeltaPct ?? "")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, minYieldDeltaPct: toNullableNumber(value) }))
            }
          />
          <TextField
            label="Min Net Gain USD"
            value={String(opsConfig.minNetGainUsd ?? "")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, minNetGainUsd: toNullableNumber(value) }))
            }
          />
          <TextField
            label="Max Route Cost USD"
            value={String(opsConfig.maxRouteCostUsd ?? "")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, maxRouteCostUsd: toNullableNumber(value) }))
            }
          />
          <TextField
            label="Cooldown Minutes"
            value={String(opsConfig.cooldownMinutes ?? "")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, cooldownMinutes: toNullableNumber(value) }))
            }
          />
          <TextField
            label="Allowed Destination Chains"
            value={(opsConfig.allowedDestinationChainIds ?? []).join(",")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, allowedDestinationChainIds: parseChainList(value) }))
            }
          />
          <TextField
            label="Blocked Chains"
            value={(opsConfig.blockedChainIds ?? []).join(",")}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, blockedChainIds: parseChainList(value) }))
            }
          />
          <TextField
            label="Alert Webhook URL"
            value={opsConfig.alertWebhookUrl ?? ""}
            onChange={(value) =>
              setOpsConfig((prev) => ({ ...prev, alertWebhookUrl: value }))
            }
          />
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-[#2B2B39] bg-[#101018] px-4 py-3 text-sm text-white">
          <input
            type="checkbox"
            checked={opsConfig.autoRebalanceEnabled}
            onChange={(e) =>
              setOpsConfig((prev) => ({
                ...prev,
                autoRebalanceEnabled: e.target.checked,
              }))
            }
          />
          Enable autonomous execution
        </label>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          title="CLI Access"
          subtitle="Generate a dedicated Lily CLI token. This is separate from the raw admin secret."
          aside={
            <ActionButton onClick={generateCliToken} disabled={isLoading}>
              Generate CLI Token
            </ActionButton>
          }
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-[#8F90A6]">
              Install Lily CLI, then run the copied command to save the token locally.
            </p>
            <TextField
              label="CLI Auth Command"
              value={cliToken ? `lily auth token ${cliToken}` : ""}
              onChange={() => {}}
              placeholder="Generate a CLI token to see the auth command."
              readOnly
            />
            <div className="text-xs text-[#707083]">
              {cliTokenExpiry
                ? `Token expires at ${new Date(cliTokenExpiry).toLocaleString()}.`
                : "Generated CLI tokens expire automatically."}
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function parseChainList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
