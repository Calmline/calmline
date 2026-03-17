"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

function TrainingModeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdParam = searchParams.get("sessionId");

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [simScenario, setSimScenario] = useState<string>("");
  const [simDifficulty, setSimDifficulty] = useState<string>("");
  const [simFocus, setSimFocus] = useState<string>("");
  const [simStatus, setSimStatus] = useState<"idle" | "coming_soon">("idle");

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/call-sessions", { cache: "no-store" });
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

  const rawId = selected ? (selected.session_id || selected.call_sid || selected.id || "") : "";
  const truncatedId = rawId.length > 20 ? `${rawId.slice(0, 10)}…${rawId.slice(-6)}` : rawId;

  return (
    <div className="min-h-0 space-y-10 bg-slate-50/60 pb-12">
      <nav className="text-xs text-slate-500 tracking-wide">
        <button
          type="button"
          onClick={() => router.push("/overview")}
          className="hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/40 rounded"
        >
          Dashboard
        </button>
        <span className="mx-1.5 text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Training Mode</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Training Mode
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 leading-relaxed">
            Review past escalation calls with coaching notes, conflict
            triggers, and a training score for agents.
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => downloadTrainingReport(selected)}
            className="shrink-0 inline-flex items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-shadow"
          >
            Download Training Report
          </button>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.65fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Sessions</h2>
            {loading && (
              <span className="text-xs text-slate-500 font-medium">Loading…</span>
            )}
          </div>
          {error ? (
            <div className="p-6 text-sm text-red-600 font-medium">{error}</div>
          ) : sessions.length === 0 && !loading ? (
            <div className="p-10 text-sm text-slate-500 leading-relaxed">
              No call sessions available yet. Once calls are completed, they
              will appear here for training review.
            </div>
          ) : (
            <ul className="max-h-[540px] overflow-auto p-4 space-y-2">
              {sessions.map((session) => {
                const isSelected = session.id === selectedId;
                const score = deriveTrainingScore(session);
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(session.id)}
                      className={`w-full rounded-xl text-left transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-50 shadow-md ring-2 ring-emerald-500/30 border-l-4 border-emerald-500 pl-4 pr-4 py-3.5"
                          : "bg-slate-50/70 hover:bg-slate-100/80 border-l-4 border-transparent pl-4 pr-4 py-3.5 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className={`line-clamp-2 font-semibold leading-snug ${isSelected ? "text-slate-900 text-[15px]" : "text-slate-800 text-sm"}`}>
                            {session.subject}
                          </p>
                          <p className="mt-2 text-xs text-slate-500 tabular-nums">
                            {formatPacificTime(session.created_at)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 truncate">
                            {session.caller_number || "Unknown caller"}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                            isSelected
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {score}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden min-h-[200px] border-l-4 border-l-emerald-500/50">
            {selected ? (
              <div className="p-6 lg:p-7">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  {selected.subject}
                </h2>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Created</dt>
                    <dd className="mt-0.5 text-slate-700 font-medium tabular-nums">{formatPacificTime(selected.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Ended</dt>
                    <dd className="mt-0.5 text-slate-700 font-medium tabular-nums">{formatPacificTime(selected.end_time)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Duration</dt>
                    <dd className="mt-0.5 text-slate-700 font-medium">{formatDuration(selected.duration_seconds)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Risk</dt>
                    <dd className="mt-0.5 text-slate-700 font-medium">{selected.escalation_risk || "—"}</dd>
                  </div>
                </dl>
                <p className="mt-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-5">
                  Use this call as a focused training scenario to practice
                  de-escalation, confident language, and clear next steps.
                </p>
                {truncatedId && (
                  <p className="mt-4 text-[10px] text-slate-400 font-mono truncate max-w-full" title={rawId}>
                    ID: {truncatedId}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-start justify-center p-8 text-center">
                <p className="text-base font-semibold text-slate-700">Select a session to start a training review</p>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  You will see an overview, escalation pattern, and coaching
                  guidance here.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden md:col-span-2">
                <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Escalation Breakdown
                  </h3>
                </div>
                <p className="p-5 text-sm text-slate-600 leading-relaxed">
                  {selected ? (
                    <>
                      Escalation risk was{" "}
                      <span className="font-semibold text-slate-800">
                        {selected.escalation_risk || "not recorded"}
                      </span>
                      . State:{" "}
                      <span className="font-semibold text-slate-800">
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

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Conflict Triggers
                  </h3>
                </div>
                <p className="p-5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {selected
                    ? findConflictTriggers(selected.transcriptText).join("\n")
                    : "Select a session to highlight the phrases, policies, or situations that most triggered customer frustration."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden md:col-span-3">
                <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Better Response
                  </h3>
                </div>
                <p className="p-5 text-sm text-slate-600 leading-relaxed">
                  {selected
                    ? buildBetterResponseHint(selected)
                    : "Select a session to see suggestions for a calmer, more structured response pattern."}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="px-5 py-2.5 border-b border-slate-200">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Additional insights
                </h3>
              </div>
              <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Score</p>
                  <p className="text-slate-600 leading-snug">
                    {selected ? (
                      <span className="font-semibold text-emerald-700">{deriveTrainingScore(selected)}</span>
                    ) : (
                      "—"
                    )}
                    {selected ? " / 100" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Training insight</p>
                  <p className="text-slate-600 leading-snug line-clamp-2">
                    {selected ? buildTrainingInsight(selected) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Escalation pattern</p>
                  <p className="text-slate-600 leading-snug line-clamp-2">
                    {selected ? buildEscalationPattern(selected) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Coaching replay</p>
                  <p className="text-slate-600 leading-snug line-clamp-2">
                    {selected ? buildCoachingReplayHint(selected) : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50/90 px-5 py-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Transcript preview
                </h3>
              </div>
              <div className="p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line line-clamp-6 font-mono text-[13px]">
                  {selected && selected.transcriptText
                    ? selected.transcriptText.trim().slice(0, 500) + (selected.transcriptText.length > 500 ? "…" : "")
                    : "Select a session to see a short transcript preview. Full transcript available in the downloaded report."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-slate-200 pt-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Conversation Simulator
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Practice de-escalation in a safe, controlled scenario. Choose a scenario and difficulty, then run a simulated call. Results and coaching feedback will appear here once the simulation flow is connected.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Setup
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Scenario
                </label>
                <select
                  value={simScenario}
                  onChange={(e) => setSimScenario(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a scenario</option>
                  <option value="billing">Billing dispute</option>
                  <option value="refund">Refund request</option>
                  <option value="cancellation">Cancellation threat</option>
                  <option value="angry_account">Angry account issue</option>
                  <option value="escalation">Escalation to manager</option>
                  <option value="hostile">Hostile caller</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Difficulty
                </label>
                <select
                  value={simDifficulty}
                  onChange={(e) => setSimDifficulty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Training focus
                </label>
                <input
                  type="text"
                  value={simFocus}
                  onChange={(e) => setSimFocus(e.target.value)}
                  placeholder="e.g. Empathy, boundary setting, resolution"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setSimStatus("coming_soon")}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
              >
                Start Simulation
              </button>
              {simStatus === "coming_soon" && (
                <p className="text-sm text-slate-600 text-center py-2 rounded-lg bg-slate-50 border border-slate-200">
                  Simulation flow not yet connected. This will launch the practice call in a future release.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Results
              </h3>
            </div>
            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Confidence Score</p>
                <p className="text-2xl font-bold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1">Available after simulation</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">De-escalation Score</p>
                <p className="text-2xl font-bold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1">Available after simulation</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Coaching Feedback</p>
                <p className="text-sm text-slate-400 italic">Run a simulation to see personalized coaching feedback here.</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Transcript Review</p>
                <p className="text-sm text-slate-400 italic">Your simulated conversation will appear here after completion.</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Better Response Suggestions</p>
                <p className="text-sm text-slate-400 italic">AI-suggested improvements will show here once the simulation is connected.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            The Proof
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Your personal record of every escalation you successfully handled.
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-md">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-700 text-2xl">
                ⭐
              </div>
            </div>
            <p className="text-center text-sm leading-relaxed text-slate-700 mb-4">
              Every time you de-escalate a difficult call, CalmLine logs it here privately. This is your evidence — documented proof that you are good at this, that you are improving, and that hard calls do not define you. Only you can see this.
            </p>
            <p className="text-center text-sm text-slate-500">
              Your wins will appear here after your first successful de-escalation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function TrainingModePage() {
  return (
    <Suspense fallback={null}>
      <TrainingModeContent />
    </Suspense>
  );
}

