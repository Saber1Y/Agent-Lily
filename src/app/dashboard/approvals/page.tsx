"use client";

import { DashboardShell } from "@/components/DashboardShell";
import {
  ActionButton,
  EmptyState,
  SectionCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { useAgentOps } from "@/components/dashboard/useAgentOps";

export default function DashboardApprovalsPage() {
  const { runs, isLoading, refresh, runLilyNow } = useAgentOps();
  const approvalItems = runs.filter((run) => run.status === "dry_run");

  return (
    <DashboardShell
      currentPage="approvals"
      title="Approval Inbox"
      subtitle="Review Lily's latest dry-run recommendations before you trigger a real move."
      actions={
        <>
          <ActionButton onClick={() => refresh()} disabled={isLoading} variant="secondary">
            Refresh
          </ActionButton>
          <ActionButton onClick={runLilyNow} disabled={isLoading}>
            Approve Latest Run
          </ActionButton>
        </>
      }
    >
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
                <StatusPill tone="accent">
                  Needs review
                </StatusPill>
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
