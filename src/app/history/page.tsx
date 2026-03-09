"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

type TranscriptItem = { timestamp?: number; speaker?: string; text?: string };

type CallSession = {
  id: string;
  session_id: string | null;
  call_sid: string | null;
  caller_number: string | null;
  receiver_number: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  transcript: string | null | TranscriptItem[] | { [key: string]: unknown };
  ai_response: string | null;
  escalation_risk: string | null;
  conversation_state: string | null;
  disruption_level: string | null;
  created_at: string;
  call_outcome: string | null;
  disposition_reason: string | null;
};

function formatPacificTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "—";
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!s) return `${m}m`;
  return `${m}m ${s}s`;
}

function extractTranscriptText(transcript: CallSession["transcript"]): string {
  if (!transcript) return "";
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((t) => (t?.text ?? "").toString().trim())
      .filter(Boolean)
      .join("\n");
  }
  try {
    return JSON.stringify(transcript);
  } catch {
    return "";
  }
}

function getCallOutcome(session: CallSession): string {
  if (session.call_outcome) return session.call_outcome;
  const risk = (session.escalation_risk || "").toLowerCase();
  if (risk === "high") return "Escalated";
  if (risk === "medium") return "Follow-up needed";
  if (risk === "low") return "Resolved";
  return "Unknown";
}

function getDispositionReason(session: CallSession): string {
  if (session.disposition_reason) return session.disposition_reason;
  const text = extractTranscriptText(session.transcript).toLowerCase();
  if (text.includes("refund") || text.includes("chargeback")) {
    return "Refund request";
  }
  if (text.includes("billing") || text.includes("invoice")) {
    return "Billing issue";
  }
  if (text.includes("cancel") || text.includes("cancellation")) {
    return "Cancellation request";
  }
  if (text.includes("account") || text.includes("login")) {
    return "Account support";
  }
  if (text.includes("manager") || text.includes("supervisor")) {
    return "Manager escalation";
  }
  return "General support";
}

function buildCustomerSummary(session: CallSession): string {
  const outcome = getCallOutcome(session);
  const risk = session.escalation_risk || "Not recorded";
  const state = session.conversation_state || "Unknown";
  return `This call shows ${risk.toLowerCase()} escalation risk with conversation state "${state}". Outcome is recorded as ${outcome.toLowerCase()}. Use this summary to quickly orient before reviewing the transcript.`;
}

function buildEscalationInsight(session: CallSession): string {
  const risk = (session.escalation_risk || "unknown").toLowerCase();
  if (risk === "high") {
    return "Risk climbed to HIGH. Focus on the moments where the customer repeated their frustration or demanded escalation, and how the agent responded.";
  }
  if (risk === "medium") {
    return "Risk reached MEDIUM. Look for early warning signs and wording that could be tightened to avoid further escalation.";
  }
  if (risk === "low") {
    return "Risk remained LOW. Highlight the phrases and behaviors that kept the customer engaged and cooperative.";
  }
  return "Escalation risk is unclear. Treat this call as a neutral baseline and look for small opportunities to increase clarity and reassurance.";
}

function buildReviewFocus(session: CallSession): string {
  const disposition = getDispositionReason(session);
  return `In review, concentrate on how the agent handled ${disposition.toLowerCase()} and whether they clearly set expectations, timelines, and next steps.`;
}

function downloadHistoryReport(session: CallSession) {
  const doc = new jsPDF();
  const marginX = 16;
  let y = 20;

  const transcriptText = extractTranscriptText(session.transcript) || "(no transcript available)";
  const outcome = getCallOutcome(session);
  const disposition = getDispositionReason(session);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CALMLINE", marginX, y);
  y += 8;

  doc.setFontSize(12);
  doc.text("Post-Call Escalation Analysis Report", marginX, y);
  y += 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, 210 - marginX, y);
  y += 8;

  const lines = (label: string, value: string | number | null | undefined) =>
    `${label}: ${value == null || value === "" ? "—" : String(value)}`;

  const overview: string[] = [];
  overview.push(
    lines("Session ID", session.session_id || session.call_sid || session.id)
  );
  overview.push(lines("Caller", session.caller_number || "Unknown"));
  overview.push(lines("Created At", formatPacificTime(session.start_time || session.created_at)));
  overview.push(lines("Ended At", formatPacificTime(session.end_time)));
  overview.push(lines("Call Duration", formatDuration(session.duration_seconds)));
  overview.push(lines("Tone", session.conversation_state || "—"));
  overview.push(lines("Escalation Risk", session.escalation_risk || "—"));
  overview.push(lines("Call Outcome", outcome));
  overview.push(lines("Disposition", disposition));

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Session Overview", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const overviewWrapped = doc.splitTextToSize(
    overview.join("\n"),
    210 - marginX * 2
  );
  doc.text(overviewWrapped, marginX, y);
  y += overviewWrapped.length * 5 + 4;

  const addSection = (title: string, body: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(body, 210 - marginX * 2);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 5 + 4;
  };

  addSection("Customer Interaction Summary", buildCustomerSummary(session));
  addSection("Conversation Transcript", transcriptText || "(no transcript available)");
  addSection(
    "AI Suggested Response",
    session.ai_response || "(no AI suggested response recorded)"
  );
  addSection("Escalation Insight", buildEscalationInsight(session));
  addSection("Recommended Coaching Focus", buildReviewFocus(session));

  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by Calmline", marginX, 290);

  const rawId = session.session_id || session.call_sid || session.id || "session";
  const safeId = rawId.replace(/[^a-zA-Z0-9-_]/g, "");
  doc.save(`calmline-report-${safeId}.pdf`);
}

export default function HistoryPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCalls() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/call-sessions");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setCalls(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load calls");
        setCalls([]);
      } finally {
        setLoading(false);
      }
    }
    loadCalls();
  }, []);

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link
          href="/overview"
          className="hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/40 rounded"
        >
          Dashboard
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800 font-medium">Call History</span>
      </nav>

      <header className="border-b border-[#E2E8F0] pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Call History
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-700">
          Browse past call sessions, transcripts, and escalation outcomes.
        </p>
      </header>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading calls…
          </div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No call sessions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-slate-50/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Time
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Caller
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Duration
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Risk
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    State
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Disruption
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, i) => (
                  <tr
                    key={call.id}
                    className={`border-b border-[#E2E8F0] ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    } hover:bg-slate-50/60 transition-colors`}
                  >
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {formatPacificTime(call.start_time || call.created_at)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {call.caller_number || "Unknown"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {call.duration_seconds != null
                        ? `${call.duration_seconds}s`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {call.escalation_risk || "-"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {call.conversation_state || "-"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {call.disruption_level || "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex flex-col items-end gap-1 text-sm">
                        <button
                          type="button"
                          onClick={() => setSelectedId(call.id)}
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/training-mode?sessionId=${
                                encodeURIComponent(
                                  call.session_id || call.call_sid || call.id
                                )
                              }`
                            )
                          }
                          className="rounded-full px-3 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                        >
                          Open in Training Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadHistoryReport(call)}
                          className="rounded-full px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                        >
                          Download Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {useMemo(
        () => {
          const selected =
            calls.find((c) => c.id === selectedId) ?? null;
          if (!selected) {
            return null;
          }
          const transcriptText =
            extractTranscriptText(selected.transcript) ||
            "(no transcript available)";
          const outcome = getCallOutcome(selected);
          const disposition = getDispositionReason(selected);
          return (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Case Summary
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Focused view of a single call for review and coaching.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Session Overview
                  </h3>
                  <p>
                    <span className="text-slate-500">Session ID:</span>{" "}
                    {selected.session_id ||
                      selected.call_sid ||
                      selected.id}
                  </p>
                  <p>
                    <span className="text-slate-500">Caller:</span>{" "}
                    {selected.caller_number || "Unknown"}
                  </p>
                  <p>
                    <span className="text-slate-500">Created At:</span>{" "}
                    {formatPacificTime(
                      selected.start_time || selected.created_at
                    )}{" "}
                    PT
                  </p>
                  <p>
                    <span className="text-slate-500">Ended At:</span>{" "}
                    {formatPacificTime(selected.end_time)} PT
                  </p>
                  <p>
                    <span className="text-slate-500">
                      Call Duration:
                    </span>{" "}
                    {formatDuration(selected.duration_seconds)}
                  </p>
                  <p>
                    <span className="text-slate-500">Tone:</span>{" "}
                    {selected.conversation_state || "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">
                      Escalation Risk:
                    </span>{" "}
                    {selected.escalation_risk || "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">
                      Call Outcome:
                    </span>{" "}
                    {outcome}
                  </p>
                  <p>
                    <span className="text-slate-500">
                      Disposition:
                    </span>{" "}
                    {disposition}
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer Interaction Summary
                    </h3>
                    <p className="mt-1 text-slate-700">
                      {buildCustomerSummary(selected)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Escalation Insight
                    </h3>
                    <p className="mt-1 text-slate-700">
                      {buildEscalationInsight(selected)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recommended Review Focus
                    </h3>
                    <p className="mt-1 text-slate-700">
                      {buildReviewFocus(selected)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Conversation Transcript
                  </h3>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-800">
                    {transcriptText}
                  </pre>
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      AI Suggested Response
                    </h3>
                    <p className="mt-1 text-xs text-slate-800">
                      {selected.ai_response ||
                        "(no AI suggested response recorded)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        },
        [calls, selectedId]
      )}
    </div>
  );
}
