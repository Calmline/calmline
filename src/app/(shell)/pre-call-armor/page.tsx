"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

function BriefRow({
  label,
  children,
  valueTone = "neutral",
}: {
  label: string;
  children: ReactNode;
  valueTone?: "neutral" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-[rgba(18,13,6,0.55)]">{label}</span>
      <div
        className={`min-w-0 text-right text-sm font-medium ${
          valueTone === "danger" ? "text-red-400" : "text-[#120D06]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function PreCallArmorPage() {
  return (
    <div className="block w-full pb-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#120D06]">
        Pre-Call Armor
      </h1>

      {/* Transfer alert */}
      <div
        className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(154,94,26,0.26)] bg-[rgba(154,94,26,0.08)] p-5 shadow-[0_2px_10px_rgba(100,70,30,0.06)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-[#120D06]">
            Incoming transfer
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
            Pre-call context will populate once available
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-[rgba(150,118,80,0.26)] bg-[#EEE4DE] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#120D06] transition hover:border-[rgba(150,118,80,0.32)] hover:bg-[#EEE4DE]"
        >
          TRANSFER
        </button>
      </div>

      <div className="relative z-0 w-full">
        <div className="mt-8 grid w-full grid-cols-2 items-start gap-8 max-md:grid-cols-1">
        {/* Left: Transfer Brief */}
        <Card className="relative min-w-0 self-start !rounded-2xl !border !border-[rgba(150,118,80,0.16)] !p-6 hover:transform-none lg:!p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#120D06]">Transfer Brief</h2>
            <span className="rounded-full border border-[rgba(154,94,26,0.28)] bg-[rgba(154,94,26,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A5E1A]">
              Pre-Call Armor
            </span>
          </div>
          <div className="space-y-4">
            <BriefRow label="Transferred">—</BriefRow>
            <BriefRow label="Support state">—</BriefRow>
            <BriefRow label="Caller number">—</BriefRow>
            <BriefRow label="Contacts (30 days)">—</BriefRow>
            <BriefRow label="Escalation">—</BriefRow>
            <BriefRow label="What was tried">—</BriefRow>
            <BriefRow label="Customer demand">—</BriefRow>
            <BriefRow label="Risk score">—</BriefRow>
          </div>
        </Card>

        {/* Right: Opener + Agent Context */}
        <div className="relative z-0 flex min-w-0 flex-col gap-8 self-start">
          <Card className="relative min-w-0 self-start !rounded-2xl !border !border-[rgba(150,118,80,0.16)] !bg-gradient-to-br !from-[rgba(154,94,26,0.08)] !to-transparent !p-6 hover:transform-none">
            <h2 className="mb-6 text-lg font-semibold text-[#120D06]">Open with this</h2>
            <div className="space-y-4 rounded-2xl border border-[rgba(154,94,26,0.18)] bg-[rgba(154,94,26,0.05)] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A5E1A]">
                Pre-Call Armor — Suggested opener
              </p>
              <p className="text-lg font-medium leading-relaxed text-[#120D06]">
                Suggested opening will appear once call context is available.
              </p>
              <p className="text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
                Calmline generates this dynamically from transfer details, prior actions, and policy context.
              </p>
            </div>
          </Card>

          <Card className="relative min-w-0 self-start !rounded-2xl !border !border-[rgba(150,118,80,0.16)] !bg-[#FEFCF8] !p-6 hover:transform-none">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#120D06]">Agent Context</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/25">
                Destiny consented
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-[rgba(18,13,6,0.55)]">Calls today:</span>
                <span className="font-medium text-[#120D06]">—</span>
              </p>
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-[rgba(18,13,6,0.55)]">High severity:</span>
                <span className="text-right font-medium text-[#120D06]">—</span>
              </p>
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-[rgba(18,13,6,0.55)]">Support state:</span>
                <span className="font-medium text-[#120D06]">—</span>
              </p>
            </div>
            <p className="mt-4 border-t border-[rgba(150,118,80,0.16)] pt-4 text-[11px] leading-relaxed text-[rgba(18,13,6,0.45)]">
              Visible because Destiny consented to share her load for this shift only.
            </p>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
