"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useWalletContext } from "@/components/WalletContext";

export interface AgentOpsConfig {
  currentChainId: number;
  positionUsdc: string;
  autoRebalanceEnabled: boolean;
  minYieldDeltaPct?: number | null;
  minNetGainUsd?: number | null;
  maxRouteCostUsd?: number | null;
  cooldownMinutes?: number | null;
  allowedDestinationChainIds?: number[] | null;
  blockedChainIds?: number[] | null;
  alertWebhookUrl?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  telegramEnabled?: boolean | null;
}

export interface AgentRun {
  id: string;
  createdAt: string;
  triggerSource: string;
  status: string;
  mode: string;
  message: string;
}

export interface AgentReport {
  sampleSize: number;
  executed: number;
  dryRuns: number;
  skipped: number;
  errors: number;
  projectedNetAnnualGainUsd: number;
  latestRun?: AgentRun | null;
}

const defaultConfig: AgentOpsConfig = {
  currentChainId: 42161,
  positionUsdc: "100",
  autoRebalanceEnabled: false,
  minYieldDeltaPct: 0.2,
  minNetGainUsd: 0,
  maxRouteCostUsd: 10,
  cooldownMinutes: 30,
  allowedDestinationChainIds: [],
  blockedChainIds: [],
  alertWebhookUrl: "",
  telegramBotToken: "",
  telegramChatId: "",
  telegramEnabled: false,
};

function getAuthorizedHeaders(walletAddress?: string) {
  if (!walletAddress) {
    throw new Error("Connect a wallet to load dashboard data.");
  }

  return {
    "x-wallet-address": walletAddress,
  };
}

export function useAgentOps() {
  const { primaryWallet } = useWalletContext();
  const [opsConfig, setOpsConfig] = useState<AgentOpsConfig>(defaultConfig);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!primaryWallet?.address) {
      setRuns([]);
      setReport(null);
      return;
    }

    setIsLoading(true);
    try {
      const headers = getAuthorizedHeaders(primaryWallet?.address);

      const [configRes, runsRes, reportRes] = await Promise.all([
        fetch("/api/agent/config", { headers }),
        fetch("/api/agent/runs", { headers }),
        fetch("/api/agent/report", { headers }),
      ]);

      if (!configRes.ok || !runsRes.ok || !reportRes.ok) {
        throw new Error("Wallet-scoped dashboard data is unavailable.");
      }

      const configJson = await configRes.json();
      const runsJson = await runsRes.json();
      const reportJson = await reportRes.json();

      setOpsConfig({
        ...defaultConfig,
        ...(configJson.config || {}),
        alertWebhookUrl: configJson.config?.alertWebhookUrl ?? "",
        telegramBotToken: configJson.config?.telegramBotToken ?? "",
        telegramChatId: configJson.config?.telegramChatId ?? "",
      });
      setRuns(runsJson.runs ?? []);
      setReport(reportJson.report ?? null);
    } catch (error) {
      toast.error("Failed to load dashboard.", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [primaryWallet?.address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...opsConfig,
        alertWebhookUrl: opsConfig.alertWebhookUrl?.trim() || null,
        telegramBotToken: opsConfig.telegramBotToken?.trim() || null,
        telegramChatId: opsConfig.telegramChatId?.trim() || null,
      };

      const response = await fetch("/api/agent/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthorizedHeaders(primaryWallet?.address),
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Failed to save config.");
      }

      toast.success("Dashboard settings saved.");
      await refresh();
      return true;
    } catch (error) {
      toast.error("Failed to save settings.", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const runLilyNow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/agent/rebalance", {
        method: "POST",
        headers: getAuthorizedHeaders(primaryWallet?.address),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Failed to trigger run.");
      }

      toast.success("Agent Lily run completed.");
      await refresh();
      return true;
    } catch (error) {
      toast.error("Run failed.", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    opsConfig,
    setOpsConfig,
    runs,
    report,
    isLoading,
    refresh,
    saveConfig,
    runLilyNow,
  };
}
