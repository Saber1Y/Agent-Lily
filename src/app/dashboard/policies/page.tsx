"use client";

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
