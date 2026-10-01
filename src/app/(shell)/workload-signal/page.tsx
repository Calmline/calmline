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
    <div className="rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-5 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
      <p className="text-xs font-medium text-[rgba(18,13,6,0.45)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#120D06]">{value}</p>
      <p className="mt-1 text-xs text-[rgba(18,13,6,0.45)]">{sub}</p>
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
    dot: "bg-[#9A5E1A]/70",
    ring: "ring-[rgba(154,94,26,0.25)]",
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
        <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Workload Signal</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          Real-time view of your current workload and support conditions
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-[rgba(154,94,26,0.22)] bg-[rgba(154,94,26,0.06)] p-5 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-[rgba(18,13,6,0.75)]">
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
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 shadow-[0_2px_10px_rgba(100,70,30,0.06)] hover:!translate-y-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#120D06]">Workload timeline</h2>
            <span className="rounded-full border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-2.5 py-1 text-xs font-medium tabular-nums text-[rgba(18,13,6,0.5)]">
              — / 100
            </span>
          </div>
          <div className="flex gap-4 rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEE4DE] text-[#9A5E1A]">
              <Clock className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-[#120D06]">
                Current state: <span className="text-[rgba(18,13,6,0.45)]">—</span>
              </p>
              <p className="text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
                Calmline will adapt response tone and guidance based on your workload throughout the
                shift.
              </p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-4 text-base font-semibold text-[#120D06]">State definitions</h2>
          <div className="flex flex-col gap-3">
            {STATES.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot} ring-2 ${s.ring}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-[#120D06]">{s.label}</span>
                    <p className="mt-1 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-[11px] text-[rgba(18,13,6,0.4)]">
        <Activity className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        <span>Supportive signal only — not a performance review.</span>
      </p>
    </div>
  );
}
