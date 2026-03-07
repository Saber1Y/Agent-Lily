"use client";

import { useState } from "react";
import { HiOutlineMenu } from "react-icons/hi";

import { Sidebar } from "./Sidebar";

export function DashboardShell(props: {
  currentPage:
    | "dashboard"
    | "chat"
    | "approvals"
    | "policies"
    | "reports"
    | "telegram";
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#0A0A0F]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(247,182,245,0.08),transparent_22%),linear-gradient(180deg,#0A0A0F,#0B0B10)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentPage={props.currentPage}
        showChatHistory={false}
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#232330] bg-[#101017]/88 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-xl border border-[#2B2B39] bg-[#16161F] p-2 text-[#A0A0B0] transition-colors hover:text-white"
              >
                <HiOutlineMenu className="w-5 h-5" />
              </button>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#fab6f5]" />
                  <span className="text-[11px] uppercase tracking-[0.24em] text-[#7B7C91]">
                    Agent Lily Workspace
                  </span>
                </div>
                <h1 className="text-xl font-semibold tracking-[-0.03em] text-white">
                  {props.title}
                </h1>
                <p className="mt-1 text-sm text-[#8D8EA3]">{props.subtitle}</p>
              </div>
            </div>
            {props.actions ? (
              <div className="flex items-center gap-3">{props.actions}</div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{props.children}</div>
        </main>
      </div>
    </div>
  );
}
