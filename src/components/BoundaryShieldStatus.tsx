"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type BoundaryShieldStatusProps = {
  isActiveCall: boolean;
  conversationState: string | null;
  riskSignals: string[];
};

function isTriggered(conversationState: string | null, riskSignals: string[]) {
  const state = (conversationState ?? "").toUpperCase();
  return state === "ABUSIVE" || riskSignals.includes("abusive_language");
}

/**
 * Live Protection status for verbal-boundary monitoring.
 * Does not run detection — it only displays signals the gateway already emits
 * (`risk_update.signals`, `conversation_state.state`).
 */
export function BoundaryShieldStatus({
  isActiveCall,
  conversationState,
  riskSignals,
}: BoundaryShieldStatusProps) {
  const triggered = isTriggered(conversationState, riskSignals);

  const statusLabel = !isActiveCall
    ? "Inactive"
    : triggered
      ? "Triggered"
      : "Monitoring";

  const statusDetail = !isActiveCall
    ? "Boundary Shield starts when a live session is connected."
    : triggered
      ? "Abusive language signal received. Use the live coaching script and follow your organization’s protocol."
      : "Listening with the existing live transcript. No verbal-boundary event yet.";

  const badgeClass = triggered
    ? "border-[rgba(168,72,72,0.28)] bg-[rgba(168,72,72,0.1)] text-[#A84848]"
    : isActiveCall
      ? "border-[rgba(78,122,94,0.22)] bg-[rgba(78,122,94,0.1)] text-[#4E7A5E]"
      : "border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] text-[rgba(18,13,6,0.5)]";

  return (
    <section
      className="shrink-0 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4 shadow-[0_2px_10px_rgba(100,70,30,0.06)]"
      aria-label="Boundary Shield"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">
            Boundary Shield
          </p>
          <p className="mt-2 font-serif text-lg text-[#120D06]">Verbal abuse protection</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-[3px] text-[11px] font-medium ${badgeClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEE4DE] text-[#9A5E1A]">
          <ShieldAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-[13px] leading-relaxed text-[#120D06]/70">{statusDetail}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
            Protocol
          </p>
          <p className="mt-1 text-[13px] text-[#120D06]">Tier 1 · warning first</p>
        </div>
        <div className="rounded-[10px] border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
            Warning script
          </p>
          <p className="mt-1 text-[13px] text-[#120D06]/70">
            {triggered
              ? "Shown in AI Coaching when a boundary script is issued."
              : "Appears here from live coaching when a boundary event fires."}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-[#120D06]/45">
        Incident history stays on the{" "}
        <Link href="/boundary-shield" className="font-medium text-[#9A5E1A] underline-offset-2 hover:underline">
          Boundary Shield
        </Link>{" "}
        protocol page. Detection is not added in this view.
      </p>
    </section>
  );
}
