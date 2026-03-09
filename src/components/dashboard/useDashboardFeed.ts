"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useWalletContext } from "@/components/WalletContext";

export interface DashboardRun {
  id: string;
  createdAt: string;
  triggerSource: string;
  status: string;
  mode: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DashboardReport {
  sampleSize: number;
  executed: number;
  dryRuns: number;
  skipped: number;
  errors: number;
  projectedNetAnnualGainUsd: number;
  latestRun?: DashboardRun | null;
}

export function useDashboardFeed() {
  const { primaryWallet } = useWalletContext();
  const [runs, setRuns] = useState<DashboardRun[]>([]);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!primaryWallet?.address) {
      setRuns([]);
      setReport(null);
      return;
    }

    setIsLoading(true);
    try {
      const [runsRes, reportRes] = await Promise.all([
        fetch("/api/dashboard/runs", {
          headers: {
            "x-wallet-address": primaryWallet.address,
          },
        }),
        fetch("/api/dashboard/report", {
          headers: {
            "x-wallet-address": primaryWallet.address,
          },
        }),
      ]);

      if (!runsRes.ok || !reportRes.ok) {
        throw new Error("Dashboard data is unavailable.");
      }

      const runsJson = await runsRes.json();
      const reportJson = await reportRes.json();

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

  return {
    runs,
    report,
    isLoading,
    refresh,
  };
}
