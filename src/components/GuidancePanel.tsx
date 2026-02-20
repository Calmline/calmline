"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import type { AnalysisData } from "@/lib/analyze";
import { RiskBadge } from "@/components/RiskBadge";

type Props = {
  data: AnalysisData | null;
  loading?: boolean;
  isLive?: boolean;
  onRegenerate?: () => void;
};

const riskBarColor: Record<string, string> = {
  Low: "bg-emerald-500",
  Moderate: "bg-amber-500",
  High: "bg-red-500",
  Critical: "bg-red-700",
};

const ESCALATION_ALTERNATES: string[] = [
  "I'll document your request and ensure a supervisor calls you back within the agreed timeframe. May I confirm the best number and time to call?",
  "While a manager isn't available right now, I can create an escalation case and set a callback. Would that work for you?",
  "I've noted that you've requested escalation. Our team will follow up within [timeframe]. Is there anything else I can address in the meantime?",
];

function RiskBlock({
  label,
  value,
  level,
  compact,
}: {
  label: string;
  value: number;
  level: string;
  compact?: boolean;
}) {
  const barColor = riskBarColor[level] ?? "bg-neutral-300";
  return (
    <div>
      <p
        className={
          compact
            ? "text-[11px] font-medium uppercase tracking-wide text-neutral-400"
            : "text-xs font-semibold uppercase tracking-wide text-neutral-500"
        }
      >
        {label}
      </p>
      <div
        className={
          compact ? "mt-1.5 flex items-baseline gap-2" : "mt-2 flex items-baseline gap-3"
        }
      >
        <span
          className={
            compact
              ? "text-lg font-semibold text-neutral-700"
              : "text-3xl font-bold text-neutral-900"
          }
        >
          {value}%
        </span>
        <RiskBadge level={level as "Low" | "Moderate" | "High" | "Critical"} />
      </div>
      <div
        className={`mt-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${compact ? "h-1.5" : "h-2"}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

const cardClass =
  "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8";

type TimelineVariant = "calm" | "frustration" | "escalation" | "manager";

type TimelineItem = { label: string; variant: TimelineVariant };

function buildTimelineItems(data: AnalysisData): TimelineItem[] {
  const items: TimelineItem[] = [];
  const sentiment = data.toneAnalysis?.customerSentiment;
  if (sentiment) {
    if (sentiment === "Calm") items.push({ label: "Calm start", variant: "calm" });
    else if (sentiment === "Frustrated") items.push({ label: "Frustration detected", variant: "frustration" });
    else if (sentiment === "Angry") items.push({ label: "Tension rising", variant: "escalation" });
    else if (sentiment === "Escalating") items.push({ label: "Escalation detected", variant: "escalation" });
  }
  let managerAdded = false;
  (data.riskDrivers ?? []).forEach((driver) => {
    const lower = driver.toLowerCase();
    if (!managerAdded && (lower.includes("manager") || lower.includes("supervisor") || lower.includes("escalat"))) {
      items.push({ label: "Manager request", variant: "manager" });
      managerAdded = true;
    } else if (!lower.includes("manager") && !lower.includes("supervisor")) {
      items.push({ label: driver, variant: items.length === 0 ? "frustration" : "escalation" });
    }
  });
  return items;
}

const timelineMarker: Record<TimelineVariant, { dot: string; label: string }> = {
  calm: { dot: "bg-emerald-500", label: "text-neutral-800" },
  frustration: { dot: "bg-amber-400", label: "text-neutral-800" },
  escalation: { dot: "bg-red-500", label: "text-neutral-800" },
  manager: { dot: "bg-amber-600 ring-2 ring-amber-200", label: "text-neutral-800" },
};

function ConversationTimeline({
  items,
  compact,
}: {
  items: TimelineItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className={compact ? "rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3" : cardClass}>
      <h3
        className={
          compact
            ? "mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500"
            : "mb-5 text-lg font-semibold text-neutral-800"
        }
      >
        Conversation timeline
      </h3>
      <div className="relative border-l-2 border-neutral-200 pl-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative flex items-start gap-2 pb-2.5 last:pb-0"
          >
            <span
              className={`absolute -left-[17px] top-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${timelineMarker[item.variant].dot}`}
              aria-hidden
            />
            <span
              className={`text-xs font-medium ${timelineMarker[item.variant].label}`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidancePanelInner({ data, loading, isLive, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const [scriptPulse, setScriptPulse] = useState(false);
  const prevScriptRef = useRef<string | null>(null);

  const handleCopyScript = useCallback(() => {
    if (!data?.suggestedResponse) return;
    void navigator.clipboard.writeText(data.suggestedResponse).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data?.suggestedResponse]);

  useEffect(() => {
    if (!data?.suggestedResponse) return;
    const prev = prevScriptRef.current;
    prevScriptRef.current = data.suggestedResponse;
    if (prev !== null && prev !== data.suggestedResponse) {
      setScriptPulse(true);
      const t = setTimeout(() => setScriptPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [data?.suggestedResponse]);

  const showListening = isLive && loading;
  const scriptContent =
    data?.suggestedResponse ||
    "No suggestion yet. Keep the conversation going and analyze again.";

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-neutral-300 bg-[#faf8f5] px-6 py-12 shadow-sm">
        {isLive && (
          <p className="mb-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <span className="listening-dots inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Listening…
          </p>
        )}
        <p className="text-center text-sm text-neutral-500">
          {isLive ? "Updating guidance…" : "Analyzing…"}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-neutral-300 bg-[#faf8f5] px-6 py-12 shadow-sm">
        <p className="text-center text-sm text-neutral-500">
          {isLive
            ? "Live coaching will appear here as you talk."
            : "Enter or paste a transcript and analyze to see guidance."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {isLive && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          AI Coaching Response (Live)
        </p>
      )}

      {/* Primary: Live Coaching Guidance — main script dominates */}
      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-800">
            Live Coaching Guidance
          </h2>
          {showListening && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
              Listening…
            </span>
          )}
        </div>
        <div
          className={`min-h-[100px] rounded-r border border-neutral-200 border-l-4 border-l-neutral-500 bg-white py-5 pl-5 pr-6 sm:pl-6 sm:pr-7 ${scriptPulse ? "animate-script-appear" : ""}`}
        >
          <p
            className="text-[18px] leading-relaxed text-neutral-800 sm:text-[20px]"
            style={{ fontFeatureSettings: "normal" }}
          >
            {scriptContent}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Post-call only: show Copy when session has ended (not during live). */}
          {!isLive && (
            <button
              type="button"
              onClick={handleCopyScript}
              disabled={!data.suggestedResponse}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy Final Script"}
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Regenerate Response
            </button>
          )}
        </div>

        {/* Escalation Deflection Options — when transcript includes manager/supervisor/escalate/complaint keywords */}
        {data.escalationDeflectionOptions && (
          <div className="mt-5 border-t border-neutral-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-800">
              Escalation Deflection Options
            </h3>
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Empathetic Delay
                </h4>
                <ul className="space-y-1.5 text-sm text-neutral-700">
                  {data.escalationDeflectionOptions.empatheticDelay.acknowledgeRequest && (
                    <li>
                      <span className="font-medium text-neutral-600">Acknowledge request: </span>
                      {data.escalationDeflectionOptions.empatheticDelay.acknowledgeRequest}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.empatheticDelay.reinforceOwnership && (
                    <li>
                      <span className="font-medium text-neutral-600">Reinforce ownership: </span>
                      {data.escalationDeflectionOptions.empatheticDelay.reinforceOwnership}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.empatheticDelay.offerResolutionFirst && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer resolution first: </span>
                      {data.escalationDeflectionOptions.empatheticDelay.offerResolutionFirst}
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Manager Unavailable Script
                </h4>
                <ul className="space-y-1.5 text-sm text-neutral-700">
                  {data.escalationDeflectionOptions.managerUnavailableScript.explainSupervisorAvailability && (
                    <li>
                      <span className="font-medium text-neutral-600">Explain supervisor availability: </span>
                      {data.escalationDeflectionOptions.managerUnavailableScript.explainSupervisorAvailability}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.managerUnavailableScript.offerCallbackOption && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer callback option: </span>
                      {data.escalationDeflectionOptions.managerUnavailableScript.offerCallbackOption}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.managerUnavailableScript.offerInternalEscalationWithoutTransfer && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer internal escalation without transfer: </span>
                      {data.escalationDeflectionOptions.managerUnavailableScript.offerInternalEscalationWithoutTransfer}
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Structured Containment
                </h4>
                <ul className="space-y-1.5 text-sm text-neutral-700">
                  {data.escalationDeflectionOptions.structuredContainment.offerNextActionTimeline && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer next action timeline: </span>
                      {data.escalationDeflectionOptions.structuredContainment.offerNextActionTimeline}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.structuredContainment.offerReferenceNumber && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer reference number: </span>
                      {data.escalationDeflectionOptions.structuredContainment.offerReferenceNumber}
                    </li>
                  )}
                  {data.escalationDeflectionOptions.structuredContainment.offerFollowUpCommitment && (
                    <li>
                      <span className="font-medium text-neutral-600">Offer follow-up commitment: </span>
                      {data.escalationDeflectionOptions.structuredContainment.offerFollowUpCommitment}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* If Escalation Continues — alternate responses, secondary to main script */}
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            If escalation continues
          </h3>
          <ul className="space-y-0">
            {ESCALATION_ALTERNATES.map((text, i) => (
              <li key={i} className="border-t border-neutral-100 first:border-t-0 first:pt-0 pt-3 first:mt-0 mt-3">
                <p className="text-sm leading-snug text-neutral-600">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {data.summary && (
          <p className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            {data.summary}
          </p>
        )}
      </div>

      {/* Collapsible risk sections — reduced weight */}
      <details className="group rounded-xl border border-neutral-100 bg-neutral-50/50">
        <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            Risk overview & tone
            <span className="inline-block text-neutral-400 transition-transform group-open:rotate-180">
              ▼
            </span>
          </span>
        </summary>
        <div className="grid gap-4 border-t border-neutral-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-neutral-100/80 bg-white/60 px-3 py-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              Risk Overview
            </h3>
            <div className="space-y-3">
              <RiskBlock
                compact
                label="Escalation risk"
                value={data.escalationRisk}
                level={data.escalationLevel}
              />
              <RiskBlock
                compact
                label="Complaint risk"
                value={data.complaintRisk}
                level={data.complaintLevel}
              />
              {data.confidenceScore != null && (
                <p className="text-[10px] text-neutral-400">
                  Confidence: {data.confidenceScore}%
                </p>
              )}
            </div>
          </div>

          {data.toneAnalysis && (
            <div className="rounded-lg border border-neutral-100/80 bg-white/60 px-3 py-3">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Tone analysis
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-medium uppercase text-neutral-400">
                    Customer
                  </p>
                  <p className="text-xs font-medium text-neutral-600">
                    {data.toneAnalysis.customerSentiment}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-neutral-400">
                    Agent
                  </p>
                  <p className="text-xs font-medium text-neutral-600">
                    {data.toneAnalysis.agentTone}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-neutral-400">
                    Volatility
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <div
                      className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200"
                      role="progressbar"
                      aria-valuenow={data.toneAnalysis.volatilityScore}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-neutral-400 transition-all"
                        style={{
                          width: `${Math.min(100, data.toneAnalysis.volatilityScore)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-neutral-400">
                      {data.toneAnalysis.volatilityScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {data.riskDrivers?.length > 0 && (
            <div className="rounded-lg border border-neutral-100/80 bg-white/60 px-3 py-3 sm:col-span-2 lg:col-span-1">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Risk drivers
              </h3>
              <ul className="space-y-1">
                {data.riskDrivers.map((driver, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] text-neutral-500"
                  >
                    <span
                      className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-neutral-400"
                      aria-hidden
                    />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>

      <ConversationTimeline items={buildTimelineItems(data)} compact />
    </div>
  );
}

export const GuidancePanel = memo(GuidancePanelInner);
