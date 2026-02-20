"use client";

import { useEffect, useRef } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import type { AnalysisData } from "@/lib/analyze";

type Props = {
  transcript: string;
  setTranscript: (value: string) => void;
  loading: boolean;
  isLive: boolean;
  sessionEnded: boolean;
  onStartLive: () => void;
  onStopLive: () => void;
  riskLevel: "Low" | "Moderate" | "High" | "Critical" | null;
  result: AnalysisData | null;
  onGenerateCallSummary?: () => void;
  onGenerateEscalationNotes?: () => void;
};

export function TranscriptForm({
  transcript,
  setTranscript,
  loading,
  isLive,
  sessionEnded,
  onStartLive,
  onStopLive,
  riskLevel,
  result,
  onGenerateCallSummary,
  onGenerateEscalationNotes,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const primaryBtn =
    "rounded-xl py-3 px-6 text-base font-semibold text-white transition bg-black hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryBtn =
    "rounded-xl border border-neutral-300 bg-white py-3 px-6 text-base font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral-800">
          Live transcript
        </h2>
        {/* Risk badge: show during live and after session when we have result. */}
        {riskLevel !== null && <RiskBadge level={riskLevel} />}
      </div>

      <div className="space-y-5">
        <textarea
          ref={textareaRef}
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste or type the conversation transcript here. Example:&#10;Agent: How can I help you today?&#10;Customer: This is the third time I've called! Your billing is wrong and I want to speak to a manager."
          rows={8}
          className="w-full rounded-xl border border-accent bg-white px-6 py-5 text-base leading-relaxed text-heading placeholder-muted shadow-input transition-all duration-200 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 disabled:opacity-60"
        />

        {/* Primary CTA: Start Live Session / Stop Live Session */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {!isLive ? (
            <button
              type="button"
              onClick={onStartLive}
              className={primaryBtn}
            >
              Start Live Session
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopLive}
              className="rounded-xl border border-red-200 bg-red-50 py-3 px-6 text-base font-semibold text-red-800 transition hover:bg-red-100"
            >
              Stop Live Session
            </button>
          )}
        </div>

        {/* Post-call artifacts: only after session ends (isLive false, sessionEnded true). Hidden during live. */}
        {sessionEnded && !isLive && (
          <div className="space-y-4 border-t border-neutral-200 pt-5">
            <p className="text-sm font-medium text-neutral-600">
              Session ended — generate artifacts
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onGenerateCallSummary}
                disabled={loading || !transcript.trim()}
                className={secondaryBtn}
              >
                {loading ? "Generating…" : "Generate Call Summary"}
              </button>
              <button
                type="button"
                onClick={onGenerateEscalationNotes}
                disabled={loading || !transcript.trim()}
                className={secondaryBtn}
              >
                Generate Internal Escalation Notes
              </button>
            </div>

            {/* Risk Breakdown */}
            {result && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Risk Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">Escalation:</span>
                    <RiskBadge level={result.escalationLevel} />
                    <span className="text-xs text-neutral-600">
                      {result.escalationRisk}%
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">Complaint:</span>
                    <RiskBadge level={result.complaintLevel} />
                    <span className="text-xs text-neutral-600">
                      {result.complaintRisk}%
                    </span>
                  </div>
                  {result.riskDrivers && result.riskDrivers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                        Risk drivers
                      </p>
                      <ul className="space-y-1">
                        {result.riskDrivers.map((driver, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-neutral-600"
                          >
                            <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-neutral-400" />
                            {driver}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
