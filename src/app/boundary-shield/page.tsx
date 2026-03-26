"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

function MetricCard({
  title,
  value,
  subtext,
}: {
  title: string;
  value: ReactNode;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0F1C2B]/95 to-[#0B1623]/98 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <p className="text-xs font-medium text-white/50">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white/90">{value}</p>
      <p className="mt-1 text-xs text-white/45">{subtext}</p>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  children,
  className = "",
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`!rounded-xl !border-white/[0.08] !bg-gradient-to-b !from-[#0F1C2B] !to-[#0B1623] !p-6 hover:!translate-y-0 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        {badge}
      </div>
      {children}
    </Card>
  );
}

export default function BoundaryShieldPage() {
  return (
    <div className="block w-full pb-10">
      <header className="max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">
          Boundary Shield
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          Verbal abuse protection for live support interactions
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Activations" value="—" subtext="Since start" />
        <MetricCard title="This Month" value="—" subtext="No data yet" />
        <MetricCard
          title="Resolved Without Escalation"
          value="—"
          subtext="Will populate with usage"
        />
        <MetricCard title="Auto-Documented" value="—" subtext="Logged automatically" />
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Incident History"
          badge={
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/55">
              0 incidents
            </span>
          }
        >
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-[#22C7C9]/80">
              <ShieldAlert className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-white/75">No incidents recorded yet</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/50">
              Boundary Shield activity will appear here once calls are monitored.
            </p>
          </div>
        </SectionCard>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Your Organization&apos;s Protocol">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-teal-400/35 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-200/95"
              >
                Tier 1
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55 transition hover:border-white/[0.12] hover:text-white/70"
              >
                Tier 2
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55 transition hover:border-white/[0.12] hover:text-white/70"
              >
                Tier 3
              </button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Select a tier to view escalation handling guidelines.
            </p>
          </SectionCard>

          <SectionCard title="Authorization">
            <p className="text-sm leading-relaxed text-white/65">
              This organization enables verbal boundary protection tools for agents during
              high-risk calls.
            </p>
          </SectionCard>

          <SectionCard title="Warning Script">
            <p className="text-xs leading-relaxed text-white/50">
              Scripts will appear here based on escalation level.
            </p>
            <div
              className="mt-4 min-h-[120px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              aria-hidden
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
