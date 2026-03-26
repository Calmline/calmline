"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

type TabId = "overview" | "simulator" | "review" | "modules";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "simulator", label: "Conversation Simulator" },
  { id: "review", label: "Call Review" },
  { id: "modules", label: "Modules" },
];

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#E6EEF6] shadow-sm focus:border-teal-400/35 focus:outline-none focus:ring-1 focus:ring-teal-400/25";

function MetricTile({
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

function ProgressRow({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-white/70">{label}</span>
        <span className="shrink-0 tabular-nums text-white/40">—</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-0 rounded-full bg-teal-500/40" aria-hidden />
      </div>
    </div>
  );
}

export default function TrainingModePage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [simScenario, setSimScenario] = useState("");
  const [simDifficulty, setSimDifficulty] = useState("");
  const [simFocus, setSimFocus] = useState("");
  const [simHint, setSimHint] = useState(false);

  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Training Mode</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          Practice with real scenarios · Improve de-escalation · Everything is private to you
        </p>
      </header>

      <div
        className="mt-6 flex flex-wrap gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] p-1.5 shadow-inner"
        role="tablist"
        aria-label="Training sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition sm:text-sm ${
                active
                  ? "bg-teal-500/20 text-teal-100 shadow-sm ring-1 ring-teal-400/25"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white/75"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile title="Sessions completed" value="—" sub="Lifetime" />
            <MetricTile title="Calls reviewed" value="—" sub="With transcript" />
            <MetricTile title="Modules completed" value="—" sub="In progress" />
            <MetricTile title="Simulator runs" value="—" sub="This month" />
          </div>

          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="!rounded-xl !border-white/[0.08] !p-6 shadow-[0_8px_28px_rgba(0,0,0,0.2)] hover:!translate-y-0">
              <h2 className="text-base font-semibold text-white/90">Suggested for you</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-white/90">
                    De-escalation under pressure
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Practice handling high-emotion billing disputes
                  </p>
                  <p className="mt-2 text-[11px] text-white/40">12 min · Scenario</p>
                  <button
                    type="button"
                    onClick={() => setTab("simulator")}
                    className="mt-4 rounded-lg bg-teal-500/90 px-4 py-2 text-xs font-medium text-[#0B141F] transition hover:bg-teal-400"
                  >
                    Start
                  </button>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-white/90">Boundary-setting practice</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Stay calm when callers push past policy limits
                  </p>
                  <p className="mt-2 text-[11px] text-white/40">10 min · Scenario</p>
                  <button
                    type="button"
                    onClick={() => setTab("simulator")}
                    className="mt-4 rounded-lg border border-white/[0.12] bg-transparent px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
                  >
                    Start
                  </button>
                </div>
              </div>
            </Card>

            <Card className="!rounded-xl !border-white/[0.08] !p-6 shadow-[0_8px_28px_rgba(0,0,0,0.2)] hover:!translate-y-0">
              <h2 className="text-base font-semibold text-white/90">Your progress</h2>
              <div className="mt-5 space-y-5">
                <ProgressRow label="De-escalation techniques" />
                <ProgressRow label="Boundary handling" />
                <ProgressRow label="Pre-call readiness" />
                <ProgressRow label="Policy awareness" />
              </div>
              <p className="mt-6 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-white/45">
                Progress is private to you. It is not shared with your employer.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === "simulator" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Card className="!rounded-xl !border-white/[0.08] !p-5 hover:!translate-y-0">
            <h2 className="text-sm font-semibold text-white/85">Setup</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                  Scenario
                </label>
                <select
                  value={simScenario}
                  onChange={(e) => setSimScenario(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a scenario</option>
                  <option value="billing">Billing dispute</option>
                  <option value="refund">Refund request</option>
                  <option value="cancellation">Cancellation threat</option>
                  <option value="manager">Manager escalation</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                  Difficulty
                </label>
                <select
                  value={simDifficulty}
                  onChange={(e) => setSimDifficulty(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                  Training focus
                </label>
                <input
                  type="text"
                  value={simFocus}
                  onChange={(e) => setSimFocus(e.target.value)}
                  placeholder="e.g. Empathy, boundaries, resolution"
                  className={`${inputClass} placeholder:text-white/35`}
                />
              </div>
              <button
                type="button"
                onClick={() => setSimHint(true)}
                className="w-full rounded-xl bg-teal-500/90 py-2.5 text-sm font-medium text-[#0B141F] transition hover:bg-teal-400"
              >
                Start Simulation
              </button>
              {simHint ? (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-center text-xs text-white/50">
                  Simulation will connect in a future release.
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="!rounded-xl !border-white/[0.08] !p-5 hover:!translate-y-0">
            <h2 className="text-sm font-semibold text-white/85">Results</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                  Confidence score
                </p>
                <p className="mt-1 text-xl font-semibold text-white/35">—</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                  De-escalation score
                </p>
                <p className="mt-1 text-xl font-semibold text-white/35">—</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                  Coaching feedback
                </p>
                <p className="mt-2 min-h-[3rem] text-xs italic text-white/40">—</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                  Transcript review
                </p>
                <p className="mt-2 min-h-[3rem] text-xs italic text-white/40">—</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "review" && (
        <div className="mt-6">
          <Card className="!rounded-xl !border-white/[0.08] !p-8 text-center hover:!translate-y-0">
            <p className="text-sm font-medium text-white/80">
              Review past calls and coaching feedback
            </p>
            <p className="mx-auto mt-6 max-w-sm text-sm text-white/45">No training sessions yet</p>
          </Card>
        </div>
      )}

      {tab === "modules" && (
        <div className="mt-6">
          <Card className="!rounded-xl !border-white/[0.08] !p-8 text-center hover:!translate-y-0">
            <p className="text-sm text-white/55">Structured learning modules coming soon</p>
          </Card>
        </div>
      )}
    </div>
  );
}
