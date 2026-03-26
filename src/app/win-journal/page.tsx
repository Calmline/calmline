"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function WinJournalPage() {
  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Win Journal</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          A private record of moments you handled with clarity, control, and impact.
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 shadow-[0_0_24px_rgba(16,185,129,0.1)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            This space is private to you. Wins captured here are not visible to managers or
            supervisors.
          </p>
          <span className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
            Private
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 shadow-[0_8px_28px_rgba(0,0,0,0.2)] hover:!translate-y-0">
          <h2 className="text-base font-semibold text-white/90">Your entries</h2>
          <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-[#E6EEF6]/70">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-white/80">Your wins will appear here.</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/50">
              After successfully de-escalating calls, Calmline will quietly log key moments for
              your personal record.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-white/90">How it works</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Calmline identifies successful de-escalation moments and captures them as private
              entries for your review.
            </p>
          </Card>

          <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-white/90">When entries appear</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>• After a successful de-escalation</li>
              <li>• Between calls (never during a live call)</li>
              <li>• Automatically — no interruptions</li>
            </ul>
          </Card>

          <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-white/90">Why it matters</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              This is your personal record of growth. Over time, it becomes proof of your ability
              to handle difficult conversations with confidence.
            </p>
          </Card>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-relaxed text-white/45">
        No entries yet — your first win will appear soon.
      </p>
    </div>
  );
}
