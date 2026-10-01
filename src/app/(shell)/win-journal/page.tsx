"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function WinJournalPage() {
  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Win Journal</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          A private record of moments you handled with clarity, control, and impact.
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-[rgba(154,94,26,0.22)] bg-[rgba(154,94,26,0.06)] p-5 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-[rgba(18,13,6,0.75)]">
            This space is private to you. Wins captured here are not visible to managers or
            supervisors.
          </p>
          <span className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
            Private
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 shadow-[0_2px_10px_rgba(100,70,30,0.06)] hover:!translate-y-0">
          <h2 className="text-base font-semibold text-[#120D06]">Your entries</h2>
          <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEE4DE] text-[rgba(18,13,6,0.55)]">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-[rgba(18,13,6,0.75)]">Your wins will appear here.</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
              After successfully de-escalating calls, Calmline will quietly log key moments for
              your personal record.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-[#120D06]">How it works</h2>
            <p className="mt-3 text-sm leading-relaxed text-[rgba(18,13,6,0.55)]">
              Calmline identifies successful de-escalation moments and captures them as private
              entries for your review.
            </p>
          </Card>

          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-[#120D06]">When entries appear</h2>
            <ul className="mt-3 space-y-2 text-sm text-[rgba(18,13,6,0.55)]">
              <li>• After a successful de-escalation</li>
              <li>• Between calls (never during a live call)</li>
              <li>• Automatically — no interruptions</li>
            </ul>
          </Card>

          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-[#120D06]">Why it matters</h2>
            <p className="mt-3 text-sm leading-relaxed text-[rgba(18,13,6,0.55)]">
              This is your personal record of growth. Over time, it becomes proof of your ability
              to handle difficult conversations with confidence.
            </p>
          </Card>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-relaxed text-[rgba(18,13,6,0.45)]">
        No entries yet — your first win will appear soon.
      </p>
    </div>
  );
}
