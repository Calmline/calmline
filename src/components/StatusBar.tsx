"use client";

import type { ReactNode } from "react";

type StatusBarProps = {
  statusLabel: string;
  statusDotVariant: "ready" | "attention";
  phoneDisplay: string;
  toneLabel: string;
  escalationLabel: string;
  showHighRisk?: boolean;
  monitoringLabel?: string;
  onStartLiveSession: () => void;
  onEndSession: () => void;
  extraActions?: ReactNode;
};

export function StatusBar({
  statusLabel,
  statusDotVariant,
  phoneDisplay,
  toneLabel,
  escalationLabel,
  showHighRisk,
  monitoringLabel = "CalmLine AI monitoring conversation",
  onStartLiveSession,
  onEndSession,
  extraActions,
}: StatusBarProps) {
  const badgeClass =
    "inline-flex items-center rounded-full border border-[rgba(78,122,94,0.22)] bg-[rgba(78,122,94,0.1)] px-2.5 py-[3px] text-[11px] font-medium text-[#4E7A5E]";

  return (
    <div
      className="mt-3 flex flex-col gap-3 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] px-4 py-3 shadow-[0_2px_10px_rgba(100,70,30,0.06)] lg:flex-row lg:items-center lg:justify-between"
      role="status"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              statusDotVariant === "ready" ? "bg-[#4E7A5E]" : "bg-[#A87828]"
            }`}
            aria-hidden
          />
          <span className="text-[13px] font-medium text-[#120D06]">{statusLabel}</span>
        </div>
        <span className="text-[13px] text-[#120D06]/45">{phoneDisplay}</span>
        <span className={badgeClass}>TONE {toneLabel}</span>
        <span className={badgeClass}>ESCALATION RISK {escalationLabel}</span>
        {showHighRisk ? (
          <span className="text-[13px] font-semibold text-[#A84848]">HIGH RISK</span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-center text-[13px] italic text-[#120D06]/45 sm:text-right">{monitoringLabel}</p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onStartLiveSession}
            className="rounded-full bg-[#9A5E1A] px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_12px_rgba(184,115,51,0.32)] transition hover:bg-[#a06028]"
          >
            Start Live Session
          </button>
          <button
            type="button"
            onClick={onEndSession}
            className="rounded-full border border-[rgba(150,118,80,0.26)] bg-transparent px-5 py-2 text-sm font-medium text-[#120D06]/45 transition hover:border-[#A84848] hover:text-[#A84848]"
          >
            End Session
          </button>
          {extraActions}
        </div>
      </div>
    </div>
  );
}
