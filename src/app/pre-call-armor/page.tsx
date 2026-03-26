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
      <span className="shrink-0 text-xs font-medium text-white/60">{label}</span>
      <div
        className={`min-w-0 text-right text-sm font-medium ${
          valueTone === "danger" ? "text-red-400" : "text-white/90"
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
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#E6EEF6]">
        Pre-Call Armor
      </h1>

      {/* Transfer alert */}
      <div
        className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-400/20 bg-gradient-to-r from-sky-500/20 via-teal-500/15 to-teal-600/10 p-5 shadow-[0_0_20px_rgba(16,185,129,0.15),0_0_28px_rgba(14,165,233,0.1)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-[#E6EEF6]">
            Incoming transfer
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#9FB3C8]">
            Pre-call context will populate once available
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#E6EEF6] transition hover:border-white/30 hover:bg-white/[0.1]"
        >
          TRANSFER
        </button>
      </div>

      <div className="relative z-0 w-full">
        <div className="mt-8 grid w-full grid-cols-2 items-start gap-8 max-md:grid-cols-1">
        {/* Left: Transfer Brief */}
        <Card className="relative min-w-0 self-start !rounded-2xl !border !border-white/10 !p-6 hover:transform-none lg:!p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white/90">Transfer Brief</h2>
            <span className="rounded-full border border-teal-400/30 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5EEAD4]">
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
          <Card className="relative min-w-0 self-start !rounded-2xl !border !border-white/10 !bg-gradient-to-br !from-teal-500/[0.06] !to-transparent !p-6 hover:transform-none">
            <h2 className="mb-6 text-lg font-semibold text-white/90">Open with this</h2>
            <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-transparent p-6 shadow-[inset_0_1px_0_rgba(16,185,129,0.12),0_0_24px_rgba(16,185,129,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1FD6A6]/90">
                Pre-Call Armor — Suggested opener
              </p>
              <p className="text-lg font-medium leading-relaxed text-white/95">
                Suggested opening will appear once call context is available.
              </p>
              <p className="text-xs leading-relaxed text-[#9FB3C8]">
                Calmline generates this dynamically from transfer details, prior actions, and policy context.
              </p>
            </div>
          </Card>

          <Card className="relative min-w-0 self-start !rounded-2xl !border !border-white/10 !bg-gradient-to-br !from-[#0F1C2B] !via-white/[0.02] !to-[#0B1623] !p-6 hover:transform-none">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white/90">Agent Context</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/25">
                Destiny consented
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-white/60">Calls today:</span>
                <span className="font-medium text-white/90">—</span>
              </p>
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-white/60">High severity:</span>
                <span className="text-right font-medium text-white/90">—</span>
              </p>
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-white/60">Support state:</span>
                <span className="font-medium text-white/90">—</span>
              </p>
            </div>
            <p className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/50">
              Visible because Destiny consented to share her load for this shift only.
            </p>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
