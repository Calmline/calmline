"use client";

import { Activity, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";

function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0F1C2B]/95 to-[#0B1623]/98 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-medium text-white/50">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{value}</p>
      <p className="mt-1 text-xs text-white/45">{sub}</p>
    </div>
  );
}

const STATES = [
  {
    key: "baseline",
    label: "Baseline",
    body: "Standard support level",
    dot: "bg-emerald-400/70",
    ring: "ring-emerald-400/25",
  },
  {
    key: "elevated",
    label: "Elevated",
    body: "Slight increase in demand",
    dot: "bg-teal-400/70",
    ring: "ring-teal-400/20",
  },
  {
    key: "high",
    label: "High",
    body: "Increased pressure — support is adjusted",
    dot: "bg-amber-400/70",
    ring: "ring-amber-400/25",
  },
  {
    key: "critical",
    label: "Critical",
    body: "High stress conditions — maximum support guidance",
    dot: "bg-rose-400/60",
    ring: "ring-rose-400/20",
  },
] as const;

export default function WorkloadSignalPage() {
  return (
    <div className="block w-full pb-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Workload Signal</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          Real-time view of your current workload and support conditions
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 shadow-[0_0_28px_rgba(16,185,129,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            This data is private to you. Your workload signal and support state are not visible to
            managers or supervisors.
          </p>
          <span className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
            Private
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Current state" value="—" sub="Score — / 100" />
        <MetricCard title="Calls handled" value="—" sub="This shift" />
        <MetricCard title="High-severity calls" value="—" sub="Recent activity" />
        <MetricCard title="AI support mode" value="—" sub="Adjusts based on conditions" />
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 shadow-[0_8px_28px_rgba(0,0,0,0.2)] hover:!translate-y-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white/90">Workload timeline</h2>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium tabular-nums text-white/55">
              — / 100
            </span>
          </div>
          <div className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-teal-400/80">
              <Clock className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-white/85">
                Current state: <span className="text-white/50">—</span>
              </p>
              <p className="text-xs leading-relaxed text-white/50">
                Calmline will adapt response tone and guidance based on your workload throughout the
                shift.
              </p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-4 text-base font-semibold text-white/90">State definitions</h2>
          <div className="flex flex-col gap-3">
            {STATES.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0F1C2B]/90 to-[#0B1623]/95 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot} ring-2 ${s.ring}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-white/90">{s.label}</span>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-[11px] text-white/40">
        <Activity className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        <span>Supportive signal only — not a performance review.</span>
      </p>
    </div>
  );
}
