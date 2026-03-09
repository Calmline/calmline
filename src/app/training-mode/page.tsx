"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";

type TranscriptItem = { timestamp?: number; speaker?: string; text?: string };

type RawSession = {
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
};

type TrainingSession = RawSession & {
  transcriptText: string;
  subject: string;
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

function extractTranscriptText(transcript: RawSession["transcript"]): string {
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

function buildSubjectFromTranscript(text: string): string {
  const lower = text.toLowerCase();
  if (!lower.trim()) return "Training session";
  if (lower.includes("refund") || lower.includes("chargeback")) {
    return "Refund / chargeback escalation";
  }
  if (lower.includes("billing") || lower.includes("invoice")) {
    return "Billing concern and frustration";
  }
  if (lower.includes("cancel") || lower.includes("cancellation")) {
    return "Cancellation and retention call";
  }
  if (lower.includes("manager") || lower.includes("supervisor")) {
    return "Manager escalation request";
  }
  if (lower.includes("angry") || lower.includes("upset")) {
    return "De-escalation with upset customer";
  }
  if (lower.includes("technical") || lower.includes("bug")) {
    return "Technical support and troubleshooting";
  }
  return "Customer support interaction";
}

function deriveTrainingScore(session: TrainingSession): number {
  const risk = (session.escalation_risk || "").toLowerCase();
  let score = 92;
  if (risk === "high") score = 64;
  else if (risk === "medium") score = 78;
  const lower = session.transcriptText.toLowerCase();
  if (lower.includes("yell") || lower.includes("scream")) score -= 6;
  if (lower.includes("hang up") || lower.includes("cancel")) score -= 4;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}

function findConflictTriggers(text: string): string[] {
  const lower = text.toLowerCase();
  const triggers: string[] = [];
  if (lower.match(/\brefund|\bchargeback|\bmoney back/)) {
    triggers.push("Refund or chargeback threat");
  }
  if (lower.match(/\bbilling|\binvoice|\bcharged/)) {
    triggers.push("Billing confusion or overcharge concern");
  }
  if (lower.match(/\bcancel|\bcancellation|\bclose my account/)) {
    triggers.push("Cancellation and churn risk");
  }
  if (lower.match(/\bmanager|\bsupervisor|\bhigher up/)) {
    triggers.push("Manager escalation request");
  }
  if (lower.match(/\bwait|\bhold|\blong time/)) {
    triggers.push("Long wait time frustration");
  }
  if (triggers.length === 0) {
    triggers.push("General support friction (no clear trigger detected).");
  }
  return triggers;
}

function buildTrainingInsight(session: TrainingSession): string {
  const risk = (session.escalation_risk || "unknown").toLowerCase();
  if (risk === "high") {
    return "High escalation risk. Focus coaching on early acknowledgment, clear limits, and one confident path to resolution.";
  }
  if (risk === "medium") {
    return "Moderate escalation risk. Reinforce proactive reassurance, checking for understanding, and summarizing next steps.";
  }
  if (risk === "low") {
    return "Low escalation risk. Use this as a positive example and still highlight small opportunities to tighten language.";
  }
  return "Escalation risk is unclear. Use this as a neutral practice scenario to reinforce consistent de-escalation habits.";
}

function buildEscalationPattern(session: TrainingSession): string {
  const text = session.transcriptText.toLowerCase();
  if (text.includes("again") && text.includes("tired")) {
    return "Frustration increased as the customer referenced prior unresolved attempts and having to repeat their story.";
  }
  if (text.includes("manager") || text.includes("supervisor")) {
    return "Escalation peaked when the customer felt front line options were exhausted and requested a manager.";
  }
  if (text.includes("charged") || text.includes("billing")) {
    return "Tension rose around perceived billing errors and disagreement about what had been communicated or authorized.";
  }
  return "Frustration built gradually as the customer pushed for faster resolution and firmer commitments.";
}

function buildBetterResponseHint(session: TrainingSession): string {
  const risk = (session.escalation_risk || "").toLowerCase();
  if (risk === "high" || risk === "medium") {
    return "Have the agent practice a shorter acknowledgment up front, followed by one clear explanation and a specific next step.";
  }
  return "Use this call to reinforce pausing before responding, mirroring back the concern, and summarizing next steps in simple language.";
}

function buildCoachingReplayHint(session: TrainingSession): string {
  if (!session.transcriptText) {
    return "Use this space to replay how you would open the conversation, including greeting, acknowledgment, and a simple reassurance.";
  }
  return "Have the agent read a tense segment of the transcript, then immediately practice a calmer, more structured response.";
}

function downloadTrainingReport(session: TrainingSession) {
  const doc = new jsPDF();
  const marginX = 16;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CALMLINE", marginX, y);
  y += 8;

  doc.setFontSize(12);
  doc.text("Training Review Report", marginX, y);
  y += 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, 210 - marginX, y);
  y += 8;

  const lines = (label: string, value: string | number | null | undefined) =>
    `${label}: ${value == null || value === "" ? "—" : String(value)}`;

  const overview: string[] = [];
  overview.push(lines("Session ID", session.session_id || session.call_sid || session.id));
  overview.push(lines("Caller", session.caller_number || "Unknown"));
  overview.push(lines("Created At", formatPacificTime(session.created_at)));
  overview.push(lines("Ended At", formatPacificTime(session.end_time)));
  overview.push(lines("Duration", formatDuration(session.duration_seconds)));
  overview.push(lines("Tone", session.conversation_state || "—"));
  overview.push(lines("Escalation Risk", session.escalation_risk || "—"));

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Session Overview", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const overviewWrapped = doc.splitTextToSize(overview.join("\n"), 210 - marginX * 2);
  doc.text(overviewWrapped, marginX, y);
  y += overviewWrapped.length * 5 + 4;

  const trainingScore = deriveTrainingScore(session);
  const triggers = findConflictTriggers(session.transcriptText);
  const trainingInsight = buildTrainingInsight(session);
  const escalationPattern = buildEscalationPattern(session);
  const betterResponse = buildBetterResponseHint(session);
  const coachingReplay = buildCoachingReplayHint(session);

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

  addSection("Training Score", `${trainingScore}/100 (derived from escalation risk and language cues).`);
  addSection("Conflict Triggers", triggers.join("\n"));
  addSection("Training Insight", trainingInsight);
  addSection("Escalation Pattern", escalationPattern);
  addSection("Better Response", betterResponse);

  const transcriptText = session.transcriptText || "(no transcript available)";
  addSection("Transcript", transcriptText);
  addSection("AI Coaching Replay", coachingReplay);

  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by Calmline", marginX, 290);

  const rawId = session.session_id || session.call_sid || session.id || "session";
  const safeId = rawId.replace(/[^a-zA-Z0-9-_]/g, "");
  doc.save(`calmline-training-report-${safeId}.pdf`);
}

export default function TrainingModePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdParam = searchParams.get("sessionId");

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/call-sessions");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data: RawSession[] = await res.json();
        let mapped: TrainingSession[] = (Array.isArray(data) ? data : []).map(
          (row) => {
            const transcriptText = extractTranscriptText(row.transcript);
            return {
              ...row,
              transcriptText,
              subject: buildSubjectFromTranscript(transcriptText),
            };
          }
        );

        mapped = mapped.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return bTime - aTime;
        });

        if (cancelled) return;
        setSessions(mapped);

        let initialId: string | null = null;
        if (sessionIdParam) {
          const match =
            mapped.find(
              (s) =>
                s.session_id === sessionIdParam ||
                s.call_sid === sessionIdParam ||
                s.id === sessionIdParam
            ) ?? null;
          initialId = match ? match.id : null;
        } else if (mapped.length > 0) {
          initialId = mapped[0].id;
        }

        if (initialId) {
          setSelectedId((prev) => prev ?? initialId);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load sessions");
        setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [sessionIdParam]);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId]
  );

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <button
          type="button"
          onClick={() => router.push("/overview")}
          className="hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/40 rounded"
        >
          Dashboard
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800 font-medium">Training Mode</span>
      </nav>

      <header className="border-b border-[#E2E8F0] pb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Training Mode
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-700">
            Review past escalation calls with coaching notes, conflict
            triggers, and a training score for agents.
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => downloadTrainingReport(selected)}
            className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            Download Training Report
          </button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Sessions</h2>
            {loading && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>
          {error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : sessions.length === 0 && !loading ? (
            <div className="p-6 text-sm text-slate-500">
              No call sessions available yet. Once calls are completed, they
              will appear here for training review.
            </div>
          ) : (
            <ul className="max-h-[520px] space-y-0 overflow-auto p-2">
              {sessions.map((session) => {
                const isSelected = session.id === selectedId;
                const score = deriveTrainingScore(session);
                return (
                  <li key={session.id} className="p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(session.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-[#E2E8F0] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="line-clamp-1 text-sm font-medium text-slate-900">
                            {session.subject}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatPacificTime(session.created_at)} ·{" "}
                            {session.caller_number || "Unknown caller"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-700">
                            Score
                          </p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {score}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm min-h-[180px]">
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {selected.subject}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Session ID:{" "}
                      {selected.session_id || selected.call_sid || selected.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span>
                      Created: {formatPacificTime(selected.created_at)}
                    </span>
                    <span className="hidden text-slate-400 sm:inline">•</span>
                    <span>Ended: {formatPacificTime(selected.end_time)}</span>
                    <span className="hidden text-slate-400 sm:inline">•</span>
                    <span>
                      Duration: {formatDuration(selected.duration_seconds)}
                    </span>
                    <span className="hidden text-slate-400 sm:inline">•</span>
                    <span>
                      Risk: {selected.escalation_risk || "Not recorded"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700">
                  Use this call as a focused training scenario to practice
                  de-escalation, confident language, and clear next steps.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-start justify-center space-y-2 text-sm text-slate-600">
                <p>Select a session on the left to start a training review.</p>
                <p className="text-xs text-slate-500">
                  You will see an overview, escalation pattern, and coaching
                  guidance here.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Escalation Breakdown
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected ? (
                  <>
                    Escalation risk was{" "}
                    <span className="font-semibold">
                      {selected.escalation_risk || "not recorded"}
                    </span>
                    . State:{" "}
                    <span className="font-semibold">
                      {selected.conversation_state || "unknown"}
                    </span>
                    . Use this to discuss where tension rose and which
                    responses helped slow it down.
                  </>
                ) : (
                  "Select a session to review how escalation risk and conversation state changed over the call."
                )}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Conflict Triggers
              </h3>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                {selected
                  ? findConflictTriggers(selected.transcriptText).join("\n")
                  : "Select a session to highlight the phrases, policies, or situations that most triggered customer frustration."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                AI Coaching Replay
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected
                  ? buildCoachingReplayHint(selected)
                  : "Select a session to get a prompt for replaying and improving a tense moment in the conversation."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Better Response
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected
                  ? buildBetterResponseHint(selected)
                  : "Select a session to see suggestions for a calmer, more structured response pattern."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Training Insight
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected
                  ? buildTrainingInsight(selected)
                  : "Select a session to surface the main coaching theme for this interaction."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Escalation Pattern
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected
                  ? buildEscalationPattern(selected)
                  : "Select a session to trace how tension built across the call and where it peaked."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Training Score
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {selected ? (
                  <>
                    This session has a training score of{" "}
                    <span className="font-semibold">
                      {deriveTrainingScore(selected)}
                    </span>{" "}
                    out of 100, based on escalation risk and language cues.
                  </>
                ) : (
                  "Select a session to see a simple training score that you can use to track coaching progress over time."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

