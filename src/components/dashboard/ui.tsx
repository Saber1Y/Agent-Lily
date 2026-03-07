"use client";

import type { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#262633] bg-[linear-gradient(180deg,rgba(20,20,28,0.96),rgba(13,13,18,0.96))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#8F90A6]">
              {props.subtitle}
            </p>
          ) : null}
        </div>
        {props.aside}
      </div>
      <div className="mt-6">{props.children}</div>
    </section>
  );
}

export function MetricTile(props: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#262633] bg-[linear-gradient(180deg,rgba(24,24,34,0.94),rgba(14,14,20,0.94))] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#72738A]">
        {props.label}
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-[-0.03em] ${props.accent || "text-white"}`}>
        {props.value}
      </div>
    </div>
  );
}

export function ActionButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  const variant =
    props.variant === "secondary"
      ? "border border-[#343445] bg-transparent text-white hover:border-[#4B4B60]"
      : "bg-[#fab6f5] text-black hover:opacity-90";

  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variant}`}
    >
      {props.children}
    </button>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[#8F90A6]">
        {props.label}
      </span>
      <input
        type={props.type || "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        readOnly={props.readOnly}
        disabled={props.disabled}
        className="w-full rounded-2xl border border-[#2B2B39] bg-[#101018] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#5F6073] focus:border-[#fab6f5]/50"
      />
    </label>
  );
}

export function StatusPill(props: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
        props.tone === "accent"
          ? "border-[#fab6f5]/30 bg-[#fab6f5]/8 text-[#fab6f5]"
          : "border-[#2F3040] bg-[#171721] text-[#A0A1B5]"
      }`}
    >
      {props.children}
    </span>
  );
}

export function EmptyState(props: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#2A2A35] bg-[#101018] p-8 text-sm leading-6 text-[#707083]">
      {props.text}
    </div>
  );
}
