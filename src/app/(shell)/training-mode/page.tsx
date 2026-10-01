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
  "w-full rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-3 py-2 text-sm text-[#120D06] shadow-sm focus:border-[#9A5E1A]/40 focus:outline-none focus:ring-1 focus:ring-[#9A5E1A]/25";

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
    <div className="rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-5 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
      <p className="text-xs font-medium text-[rgba(18,13,6,0.45)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#120D06]">{value}</p>
      <p className="mt-1 text-xs text-[rgba(18,13,6,0.45)]">{sub}</p>
    </div>
  );
}

function ProgressRow({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[rgba(18,13,6,0.65)]">{label}</span>
        <span className="shrink-0 tabular-nums text-[rgba(18,13,6,0.4)]">—</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEE4DE]">
        <div className="h-full w-0 rounded-full bg-[#9A5E1A]/50" aria-hidden />
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
        <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Training Mode</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          Practice with real scenarios · Improve de-escalation · Everything is private to you
        </p>
      </header>

      <div
        className="mt-6 flex flex-wrap gap-2 rounded-full border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-1.5 shadow-inner"
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
                  ? "bg-[rgba(154,94,26,0.12)] text-[#9A5E1A] shadow-sm ring-1 ring-[rgba(154,94,26,0.25)]"
                  : "text-[rgba(18,13,6,0.5)] hover:bg-[#EEE4DE] hover:text-[rgba(18,13,6,0.7)]"
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
            <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 shadow-[0_2px_10px_rgba(100,70,30,0.06)] hover:!translate-y-0">
              <h2 className="text-base font-semibold text-[#120D06]">Suggested for you</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#120D06]">
                    De-escalation under pressure
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
                    Practice handling high-emotion billing disputes
                  </p>
                  <p className="mt-2 text-[11px] text-[rgba(18,13,6,0.4)]">12 min · Scenario</p>
                  <button
                    type="button"
                    onClick={() => setTab("simulator")}
                    className="mt-4 rounded-lg bg-[#9A5E1A] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#a06028]"
                  >
                    Start
                  </button>
                </div>
                <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#120D06]">Boundary-setting practice</p>
                  <p className="mt-1 text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
                    Stay calm when callers push past policy limits
                  </p>
                  <p className="mt-2 text-[11px] text-[rgba(18,13,6,0.4)]">10 min · Scenario</p>
                  <button
                    type="button"
                    onClick={() => setTab("simulator")}
                    className="mt-4 rounded-lg border border-[rgba(150,118,80,0.22)] bg-transparent px-4 py-2 text-xs font-medium text-[rgba(18,13,6,0.75)] transition hover:bg-[#EEE4DE]"
                  >
                    Start
                  </button>
                </div>
              </div>
            </Card>

            <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 shadow-[0_2px_10px_rgba(100,70,30,0.06)] hover:!translate-y-0">
              <h2 className="text-base font-semibold text-[#120D06]">Your progress</h2>
              <div className="mt-5 space-y-5">
                <ProgressRow label="De-escalation techniques" />
                <ProgressRow label="Boundary handling" />
                <ProgressRow label="Pre-call readiness" />
                <ProgressRow label="Policy awareness" />
              </div>
              <p className="mt-6 border-t border-[rgba(150,118,80,0.12)] pt-4 text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
                Progress is private to you. It is not shared with your employer.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === "simulator" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-5 hover:!translate-y-0">
            <h2 className="text-sm font-semibold text-[#120D06]">Setup</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
                  Training focus
                </label>
                <input
                  type="text"
                  value={simFocus}
                  onChange={(e) => setSimFocus(e.target.value)}
                  placeholder="e.g. Empathy, boundaries, resolution"
                  className={`${inputClass} placeholder:text-[rgba(18,13,6,0.35)]`}
                />
              </div>
              <button
                type="button"
                onClick={() => setSimHint(true)}
                className="w-full rounded-xl bg-[#9A5E1A] py-2.5 text-sm font-medium text-white transition hover:bg-[#a06028]"
              >
                Start Simulation
              </button>
              {simHint ? (
                <p className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-3 py-2 text-center text-xs text-[rgba(18,13,6,0.45)]">
                  Simulation will connect in a future release.
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-5 hover:!translate-y-0">
            <h2 className="text-sm font-semibold text-[#120D06]">Results</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.4)]">
                  Confidence score
                </p>
                <p className="mt-1 text-xl font-semibold text-[rgba(18,13,6,0.35)]">—</p>
              </div>
              <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.4)]">
                  De-escalation score
                </p>
                <p className="mt-1 text-xl font-semibold text-[rgba(18,13,6,0.35)]">—</p>
              </div>
              <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.4)]">
                  Coaching feedback
                </p>
                <p className="mt-2 min-h-[3rem] text-xs italic text-[rgba(18,13,6,0.4)]">—</p>
              </div>
              <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.4)]">
                  Transcript review
                </p>
                <p className="mt-2 min-h-[3rem] text-xs italic text-[rgba(18,13,6,0.4)]">—</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "review" && (
        <div className="mt-6">
          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-8 text-center hover:!translate-y-0">
            <p className="text-sm font-medium text-[rgba(18,13,6,0.75)]">
              Review past calls and coaching feedback
            </p>
            <p className="mx-auto mt-6 max-w-sm text-sm text-[rgba(18,13,6,0.45)]">No training sessions yet</p>
          </Card>
        </div>
      )}

      {tab === "modules" && (
        <div className="mt-6">
          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-8 text-center hover:!translate-y-0">
            <p className="text-sm text-[rgba(18,13,6,0.5)]">Structured learning modules coming soon</p>
          </Card>
        </div>
      )}
    </div>
  );
}
