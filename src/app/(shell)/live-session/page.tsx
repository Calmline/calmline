"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { StatusBar } from "@/components/StatusBar";
import { SentimentCard } from "@/components/SentimentCard";
import { BoundaryShieldStatus } from "@/components/BoundaryShieldStatus";
import { BoundaryShieldModal } from "@/components/BoundaryShieldModal";
import { BoundaryShieldTestPanel } from "@/components/BoundaryShieldTestPanel";
import {
  isBoundaryShieldActivationEvent,
  isBoundaryShieldScript,
} from "@/lib/boundaryShieldScripts";
import { useAppStatus } from "@/context/AppStatusContext";
import { useRole } from "@/context/RoleContext";

const globalForWS = globalThis as typeof globalThis & {
  __calmline_socket: WebSocket | null;
  __calmline_on_ui_message?: (event: { data: string }) => void;
};

if (!globalForWS.__calmline_socket) {
  globalForWS.__calmline_socket = null;
}

type PrecallBrief = {
  type: "precall_brief";
  risk?: string;
  context?: string;
  waitTime?: string;
  opening?: string;
};

type PrecallOverlayData = {
  from?: string;
  risk?: string;
  summary?: string;
  opening?: string;
};

type TransferBriefData = {
  phone: string;
  agent: string;
  summary: string;
  escalation_level: string;
};

function formatTransferCallerLine(caller: string | undefined): string {
  const raw = caller?.trim() ?? "";
  if (raw.length === 0) return "—";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

/** Safe stub — customer profile UI removed; satisfies any leftover reference without crashing. */
function ensureCustomerProfile(_phone?: string): null {
  return null;
}

function sentimentBarWidths(headline: string) {
  const h = headline.toUpperCase();
  if (h.includes("HIGH") || h.includes("CRITICAL"))
    return { callerTonePct: 85, agentCalmPct: 42, resolutionPct: 22 };
  if (h.includes("MODERATE") || h.includes("MEDIUM"))
    return { callerTonePct: 68, agentCalmPct: 52, resolutionPct: 38 };
  return { callerTonePct: 48, agentCalmPct: 78, resolutionPct: 55 };
}

function transcriptSpeakerRole(line: string, index: number): "customer" | "agent" {
  const t = line.trim();
  const lower = t.toLowerCase();
  if (
    /^(customer|caller|user)[\s:]/i.test(t) ||
    lower.startsWith("customer:") ||
    lower.startsWith("caller:")
  ) {
    return "customer";
  }
  if (
    /^(agent|support|representative|rep)[\s:]/i.test(t) ||
    lower.startsWith("agent:") ||
    lower.startsWith("support:")
  ) {
    return "agent";
  }
  return index % 2 === 0 ? "customer" : "agent";
}

function stripTranscriptSpeakerPrefix(line: string): string {
  return line.replace(/^\s*(customer|caller|agent|support|user|representative|rep)\s*:\s*/i, "").trim() || line;
}

function lastCallerLanguage(lines: string[]): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (transcriptSpeakerRole(lines[i], i) === "customer") {
      return stripTranscriptSpeakerPrefix(lines[i]);
    }
  }
  const last = lines[lines.length - 1];
  return last ? stripTranscriptSpeakerPrefix(last) : "";
}

export default function LiveSessionPage() {
  const pathname = usePathname();
  const { role, setRoleAndPersist } = useRole();
  const [preCallData, setPreCallData] = useState(null as any);
  const [callActive, setCallActive] = useState(false);
  const [precall, setPrecall] = useState<PrecallBrief | null>(null);
  const [precallData, setPrecallData] = useState<PrecallOverlayData | null>(null);
  const [transferData, setTransferData] =
    useState<TransferBriefData | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [coachText, setCoachText] = useState("");
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);
  const [conversationState, setConversationState] = useState<string | null>(null);
  const [toneAnalysis, setToneAnalysis] = useState<string | null>(null);
  const [callTone, setCallTone] = useState("Neutral");
  const [risk, setRisk] = useState("Low");
  const [aiThinking, setAiThinking] = useState(false);
  const [responseLocked, setResponseLocked] = useState(false);
  const [coachStatus, setCoachStatus] = useState("Listening");
  const responseLockedRef = useRef(false);
  const lastResponseTimeRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const prevTranscriptLenRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const [listeningPulse, setListeningPulse] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const { setConnection, setSession, connection, session } = useAppStatus();

  type SessionPhase = "idle" | "armed" | "active" | "ended";
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [sessionTranscript, setSessionTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callerNumber, setCallerNumber] = useState<string | null>(null);
  const [callState, setCallState] = useState<"idle" | "incoming" | "active">("idle");
  const [incomingCall, setIncomingCall] = useState<Record<string, unknown> | null>(null);
  const isActiveCall = callState === "active" || sessionPhase === "active";
  const [boundaryModal, setBoundaryModal] = useState<{
    open: boolean;
    callerLanguage: string;
    script: string;
  }>({ open: false, callerLanguage: "", script: "" });
  const [boundaryTransferring, setBoundaryTransferring] = useState(false);
  const transcriptLinesRef = useRef<string[]>([]);
  const pendingBoundaryScriptRef = useRef<string | null>(null);
  const boundarySignalRef = useRef(false);
  const boundaryDismissedRef = useRef(false);

  useEffect(() => {
    setCallState("idle");
    setIncomingCall(null);
    setSessionPhase("idle");
    setCallActive(false);
  }, []);

  const tryOpenBoundaryModal = useCallback(() => {
    const script = pendingBoundaryScriptRef.current;
    if (!script || !boundarySignalRef.current || boundaryDismissedRef.current) return;
    setBoundaryModal({
      open: true,
      script,
      callerLanguage: lastCallerLanguage(transcriptLinesRef.current),
    });
  }, []);

  useEffect(() => {
    let socket = globalForWS.__calmline_socket;
    if (socket && socket.readyState === WebSocket.CLOSED) {
      globalForWS.__calmline_socket = null;
      socket = null;
    }

    if (!globalForWS.__calmline_socket) {
      console.log("🚀 Creating ONE GLOBAL WebSocket");
      const s = new WebSocket("ws://127.0.0.1:8787/ui");
      globalForWS.__calmline_socket = s;
      s.onclose = () => {
        console.warn("⚠️ Socket closed");
        globalForWS.__calmline_socket = null;
      };
    } else {
      console.log("✅ Using existing global socket");
    }

    socket = globalForWS.__calmline_socket!;

    socket.onopen = () => {
      console.log("✅ GLOBAL WebSocket OPEN");
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error", err);
    };

    const onUiMessage = (event: { data: string }) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }
      console.log("📩 EVENT:", data);

      if (data.type === "precall_brief") {
        setCallState("incoming");
        setIncomingCall(data);
        const nested =
          data.data && typeof data.data === "object"
            ? (data.data as Record<string, unknown>)
            : null;
        if (nested) {
          setPrecall({
            type: "precall_brief",
            risk: typeof nested.risk === "string" ? nested.risk : undefined,
            context:
              typeof nested.context === "string" ? nested.context : undefined,
            waitTime:
              typeof nested.waitTime === "string" ? nested.waitTime : undefined,
            opening:
              typeof nested.opening === "string" ? nested.opening : undefined,
          });
        } else {
          setPrecall(data as PrecallBrief);
        }
        setSessionPhase("armed");
        setConnection("connecting");
      }

      if (data.type === "call_started") {
        setCallState("active");
        setSessionPhase("active");
        setCallActive(true);
        setConnection("connected");
      }

      if (data.type === "call_ended") {
        setCallState("idle");
        setIncomingCall(null);
        setSessionPhase("idle");
        setCallActive(false);
        setConnection("disconnected");
      }

      if (data.type === "call_state") {
        if (data.state === "active") {
          setCallActive(true);
          setPrecallData(null);
          setTransferData(null);
          setRoleAndPersist("agent");
        }
        setPrecall(null);
        setSessionPhase("active");
        setCallState("active");
        setConnection("connected");
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber((prev) => {
            if (prev) return prev;
            if (typeof data?.from === "string") return data.from;
            return "";
          });
        }
      }

      if (data.type === "incoming_call" || data.type === "incoming-call") {
        setSessionPhase("armed");
        setCallState("incoming");
        setIncomingCall(data);
        setConnection("connecting");
        if (typeof data.phone === "string" && data.phone.trim().length > 0) {
          setCallerNumber(data.phone);
        }
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber(data.from);
        }
      }

      if (data.type === "precall") {
        const payload =
          data.data && typeof data.data === "object"
            ? (data.data as PrecallOverlayData)
            : null;
        if (payload) setPrecallData(payload);
      }

      if (data.type === "transcript" && data.text) {
        const line = typeof data.text === "string" ? data.text : String(data.text);
        setTranscriptLines((prev) => {
          const next = [...prev, line];
          transcriptLinesRef.current = next;
          return next;
        });
        setSessionTranscript((prev) => [...prev, line]);
      }

      if (data.type === "risk_update") {
        if (typeof data.level === "string") setRiskLevel(data.level);
        if (Array.isArray(data.signals)) {
          setRiskSignals(data.signals.filter((s): s is string => typeof s === "string"));
        }
      }

      if (data.type === "conversation_state") {
        if (typeof data.state === "string") setConversationState(data.state);
        if (data.transcript && Array.isArray(data.transcript)) {
          const lines = data.transcript.filter((l): l is string => typeof l === "string");
          setTranscriptLines(lines);
          setSessionTranscript(lines);
          transcriptLinesRef.current = lines;
        }
      }

      if (isBoundaryShieldActivationEvent(data)) {
        boundarySignalRef.current = true;
        tryOpenBoundaryModal();
      }

      if (data.type === "coach_final" || data.type === "coach") {
        const text = data.message || data.text;
        if (text) {
          const response = typeof text === "string" ? text : String(text);
          setCoachText(response);
          setAiResponses((prev) => [...prev, response]);
          if (isBoundaryShieldScript(response)) {
            pendingBoundaryScriptRef.current = response;
            boundaryDismissedRef.current = false;
            tryOpenBoundaryModal();
          }
        }
      }
    };

    globalForWS.__calmline_on_ui_message = onUiMessage;
    socket.onmessage = onUiMessage;

    return () => {
      console.log("Skipping socket cleanup");
    };
  }, [setConnection, setRoleAndPersist, tryOpenBoundaryModal]);

  const displayCaller = useMemo(() => {
    const fromPrecall = (preCallData as { caller?: string } | null)?.caller;
    const raw = callerNumber ?? fromPrecall ?? "+1 (619) 555-0147";
    return formatTransferCallerLine(raw);
  }, [callerNumber, preCallData]);

  const showHighRiskBadge = useMemo(() => {
    const a = (riskLevel ?? "").toString().toUpperCase();
    const b = (risk ?? "").toString().toUpperCase();
    return a === "HIGH" || b === "HIGH";
  }, [riskLevel, risk]);

  const statusDisplay =
    callState === "active"
      ? "Connected"
      : callState === "incoming"
        ? "Incoming"
        : "Ready";

  const startSession = useCallback(() => {
    setCallState("idle");
    setIncomingCall(null);
    setCallActive(true);
    setPrecall(null);
    setPrecallData(null);
    setTransferData(null);
    setRoleAndPersist("agent");
    setTranscriptLines([]);
    setSessionTranscript([]);
    transcriptLinesRef.current = [];
    setAiResponses([]);
    setCoachText("");
    setAiThinking(false);
    setCoachStatus("Listening");
    responseLockedRef.current = false;
    setResponseLocked(false);
    lastResponseTimeRef.current = 0;
    setRiskLevel(null);
    setRiskSignals([]);
    setConversationState(null);
    setToneAnalysis(null);
    setBoundaryModal({ open: false, callerLanguage: "", script: "" });
    setBoundaryTransferring(false);
    pendingBoundaryScriptRef.current = null;
    boundarySignalRef.current = false;
    boundaryDismissedRef.current = false;
    sessionStartedRef.current = true;
    setCallerNumber(null);
    setSessionStartTime(Date.now());
    setSessionId(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`);
    setSessionPhase("armed");
    setConnection("connecting");
    setSession("listening");
    setPreCallData({
      caller: "+1 (619) 555-0147",
      name: "Repeat Caller",
      lastIssue: "Billing dispute — not resolved",
      contacts30d: 4,
      escalation: "HIGH",
      note: "Customer has called multiple times and is likely frustrated",
    });
  }, [setSession, setConnection, setRoleAndPersist]);

  const endSession = useCallback(async () => {
    sessionStartedRef.current = false;

    const duration =
      sessionStartTime != null ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const transcript = sessionTranscript.length > 0 ? sessionTranscript.join("\n") : transcriptLines.join("\n");
    const aiResponse = aiResponses.join("\n");
    const tone = conversationState || callTone;
    const escalationRisk = riskLevel || risk;

    const payload = {
      session_id: sessionId,
      transcript,
      ai_response: aiResponse,
      tone,
      escalation_risk: escalationRisk,
      call_duration: duration,
      ended_at: new Date().toISOString(),
      ...(callerNumber != null && callerNumber.trim() !== "" ? { caller_number: callerNumber.trim() } : {}),
    };
    console.log("[live-session] End Session: sending POST /api/call-history", {
      session_id: payload.session_id,
      transcriptLen: payload.transcript.length,
      ai_responseLen: payload.ai_response.length,
      call_duration: payload.call_duration,
    });
    try {
      const res = await fetch("/api/call-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = (errBody as { error?: string }).error ?? res.statusText ?? `HTTP ${res.status}`;
        console.error("[live-session] save failed:", res.status, errMsg, errBody);
        return;
      }
    } catch (err) {
      console.error("[live-session] failed to save call history:", err);
      return;
    }

    setSessionTranscript([]);
    setTranscriptLines([]);
    setAiResponses([]);
    setCoachText("");
    setAiThinking(false);
    setSessionStartTime(null);
    setSessionId(null);
    setCallerNumber(null);
    setSessionPhase("idle");
    setCallActive(false);
    setCallState("idle");
    setIncomingCall(null);
    setTransferData(null);
    setPreCallData(null);
    setRiskLevel(null);
    setRiskSignals([]);
    setConversationState(null);
    setToneAnalysis(null);
    setBoundaryModal({ open: false, callerLanguage: "", script: "" });
    setBoundaryTransferring(false);
    pendingBoundaryScriptRef.current = null;
    boundarySignalRef.current = false;
    boundaryDismissedRef.current = false;
    transcriptLinesRef.current = [];
    setRoleAndPersist("agent");
    setConnection("disconnected");
    setSession("idle");
  }, [
    setCallActive,
    setSession,
    setConnection,
    sessionStartTime,
    sessionTranscript,
    transcriptLines,
    aiResponses,
    conversationState,
    callTone,
    riskLevel,
    risk,
    sessionId,
    callerNumber,
    setRoleAndPersist,
  ]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  useEffect(() => {
    if (transcriptLines.length > prevTranscriptLenRef.current) {
      setListeningPulse(true);
      const t = window.setTimeout(() => setListeningPulse(false), 2000);
      prevTranscriptLenRef.current = transcriptLines.length;
      return () => window.clearTimeout(t);
    }
    prevTranscriptLenRef.current = transcriptLines.length;
  }, [transcriptLines]);

  const showGeneratingStatus =
    aiThinking ||
    ((callState === "active" || sessionPhase === "active") &&
      transcriptLines.length > 0 &&
      !coachText);
  const showListeningStatus =
    (callState === "active" || sessionPhase === "active") &&
    listeningPulse &&
    !showGeneratingStatus;

  const copyScript = useCallback(async () => {
    if (!coachText.trim()) return;
    try {
      await navigator.clipboard.writeText(coachText);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      /* ignore */
    }
  }, [coachText]);

  const onContinueBoundaryCall = useCallback(() => {
    boundaryDismissedRef.current = true;
    setBoundaryModal((prev) => ({ ...prev, open: false }));
  }, []);

  const onTransferBoundaryToSupervisor = useCallback(async () => {
    setBoundaryTransferring(true);
    const payload = {
      phone: displayCaller,
      agent: "Support Agent",
      summary:
        boundaryModal.callerLanguage.trim() ||
        "Boundary Shield activated — verbal abuse directed at the agent.",
      escalation_level: "HIGH",
    };
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setTransferData(payload);
      }
    } catch (err) {
      console.error("Boundary Shield transfer failed:", err);
    } finally {
      boundaryDismissedRef.current = true;
      setBoundaryTransferring(false);
      setBoundaryModal((prev) => ({ ...prev, open: false }));
    }
  }, [boundaryModal.callerLanguage, displayCaller]);

  const onEndBoundaryCall = useCallback(() => {
    boundaryDismissedRef.current = true;
    setBoundaryModal((prev) => ({ ...prev, open: false }));
    void endSession();
  }, [endSession]);

  const exportTranscript = useCallback(() => {
    const text = transcriptLines.length ? transcriptLines.join("\n") : "";
    const blob = new Blob([text || "(empty)"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calmline-transcript-${sessionId ?? "draft"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcriptLines, sessionId]);

  const onRegenerateCoaching = useCallback(() => {
    setCoachText("");
    responseLockedRef.current = false;
    setResponseLocked(false);
    lastResponseTimeRef.current = 0;
  }, []);

  const sentimentHeadline = isActiveCall ? riskLevel || risk || "—" : "—";
  const sentimentBars = useMemo(
    () => sentimentBarWidths(sentimentHeadline === "—" ? "LOW" : sentimentHeadline),
    [sentimentHeadline],
  );

  const statusBarLabel =
    statusDisplay === "Ready"
      ? "Ready"
      : statusDisplay === "Connected"
        ? "Connected"
        : statusDisplay === "Incoming"
          ? "Incoming"
          : sessionPhase === "armed"
            ? "Connecting…"
            : statusDisplay;
  const statusDotGreen =
    statusDisplay === "Ready" || statusDisplay === "Connected" || sessionPhase === "armed";

  const coachingStatusSlot = (
    <>
      {showGeneratingStatus ? (
        <p className="text-[13px] font-medium text-[#8A7B6E]">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Generating response...
          </span>
        </p>
      ) : null}
      {showListeningStatus ? (
        <p className="text-[13px] font-medium text-[#8A7B6E]">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B5E3C]" />
            Listening...
          </span>
        </p>
      ) : null}
    </>
  );

  const coachingBody =
    callState !== "active" ? (
      <p className="break-words text-center text-sm italic leading-relaxed text-[#120D06]/45">
        Live guidance will appear here when you&apos;re on a call.
      </p>
    ) : coachText ? (
      <p className="text-center font-serif text-lg italic leading-relaxed text-[#2C1A12]">
        &ldquo;{coachText}&rdquo;
      </p>
    ) : aiThinking ? (
      <p className="text-center text-sm italic leading-relaxed text-[#8A7B6E]">
        AI analyzing conversation
        <span className="ml-1 animate-pulse">...</span>
      </p>
    ) : (
      <p className="text-center text-sm italic leading-relaxed text-[#8A7B6E]">
        Waiting for the next coaching cue from your live transcript...
      </p>
    );

  const transcriptPlaceholder =
    callState === "idle" && sessionPhase === "idle"
      ? "Start a session or wait for an incoming call."
      : callState === "incoming"
        ? "Call ringing — transcript will appear when the call is active."
        : connection === "connected"
          ? "Listening for conversation…"
          : "Connect to the gateway to see the transcript.";

  return (
    <div>
      <BoundaryShieldModal
        open={boundaryModal.open}
        callerLanguage={boundaryModal.callerLanguage}
        script={boundaryModal.script}
        transferring={boundaryTransferring}
        onContinueCall={onContinueBoundaryCall}
        onTransferToSupervisor={() => void onTransferBoundaryToSupervisor()}
        onEndCall={onEndBoundaryCall}
      />
      <div className="border-b border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] pl-6 pr-6 pt-2 pb-2">
        <Header title="Live Session" subtitle="Ready to start session" />
        <div className="mt-4">
          <nav
            className="flex flex-wrap gap-x-6 gap-y-1 border-b border-black/[0.08]"
            aria-label="Workspace sections"
          >
            {(
              [
                { label: "Active Call", href: "/live-session", active: pathname === "/live-session" },
                { label: "Pre-Call Armor", href: "/pre-call-armor", active: pathname.startsWith("/pre-call-armor") },
                { label: "Call History", href: "/history", active: pathname.startsWith("/history") },
                { label: "Queue", href: "/overview", active: pathname === "/overview" },
                { label: "Emotional Load", href: "/workload-signal", active: pathname.startsWith("/workload-signal") },
                { label: "Debrief", href: "/training-mode", active: pathname.startsWith("/training-mode") },
                { label: "Performance", href: "/analytics", active: pathname.startsWith("/analytics") },
                { label: "Team", href: "/organization/agents", active: pathname.startsWith("/organization/agents") },
                { label: "Audit Log", href: "/compliance/audit-log", active: pathname.startsWith("/compliance/audit-log") },
              ] as const
            ).map((tab) => (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                className={`border-b-2 pb-2 text-[12px] font-medium uppercase tracking-wide transition-colors ${
                  tab.active
                    ? "-mb-px border-b-[#9A5E1A] text-[#9A5E1A]"
                    : "border-b-transparent text-[#120D06]/45 hover:text-[#120D06]/75"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {callState === "incoming" && (
        <div className="mt-3 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] px-4 py-3 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
          <h3 className="text-[13px] font-semibold text-[#120D06]">Incoming call</h3>
          <p className="mt-1 text-sm italic text-[#120D06]/45">
            {String(
              (typeof incomingCall?.from === "string" && incomingCall.from) ||
                (typeof incomingCall?.phone === "string" && incomingCall.phone) ||
                "—",
            )}
          </p>
        </div>
      )}

      {callState === "active" && (
        <div className="mt-3 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] px-4 py-3 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
          <h3 className="text-[13px] font-semibold text-[#120D06]">Call in progress</h3>
        </div>
      )}

      {callState === "idle" && sessionPhase === "idle" && (
        <div className="mt-3 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] px-4 py-3 text-sm text-[#120D06]/75 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
          No active call
        </div>
      )}

      {role === "agent" && (
        <>
          <div className="bg-[#F5EDE8] px-6 pb-5 pt-3">
            <StatusBar
              statusLabel={statusBarLabel}
              statusDotVariant={statusDotGreen ? "ready" : "attention"}
              phoneDisplay={displayCaller}
              toneLabel={isActiveCall ? conversationState || callTone : "—"}
              escalationLabel={isActiveCall ? riskLevel || risk : "—"}
              showHighRisk={showHighRiskBadge}
              onStartLiveSession={startSession}
              onEndSession={() => void endSession()}
              extraActions={
                (role as "agent" | "manager" | "admin") === "manager" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const payload = {
                        phone: "+16195551234",
                        agent: "Ky (Support Agent)",
                        summary:
                          "Customer upset about billing issue, requested refund, escalation triggered",
                        escalation_level: "HIGH",
                      };
                      try {
                        const res = await fetch("/api/transfer", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        if (res.ok) {
                          setTransferData(payload);
                          setRoleAndPersist("manager");
                        }
                      } catch (err) {
                        console.error("Transfer failed:", err);
                      }
                    }}
                    className="rounded-md border border-[#8B5E3C] bg-transparent px-3 py-2 text-[13px] font-medium text-[#2C1A12] transition hover:bg-[#8B5E3C]/10"
                  >
                    Simulate Transfer
                  </button>
                ) : null
              }
            />

            {process.env.NODE_ENV !== "production" ? <BoundaryShieldTestPanel /> : null}

            <div
              className="mt-4 grid grid-cols-1 items-start gap-[1.1rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              aria-label="Live session workspace"
            >
              <div className="min-w-0">
                <section className="flex min-h-[28rem] flex-col rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-[#8B5E3C]" aria-hidden />
                      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">
                        LIVE TRANSCRIPT
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={exportTranscript}
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#8B5E3C] bg-transparent px-2.5 py-1 text-[13px] font-medium text-[#8B5E3C] transition hover:bg-[#8B5E3C]/10"
                    >
                      <Download size={14} strokeWidth={1.5} aria-hidden />
                      Export
                    </button>
                  </div>
                  <div
                    ref={transcriptRef}
                    className={`flex min-h-[18rem] max-h-[24rem] flex-1 flex-col overflow-y-auto rounded-[10px] border border-[rgba(150,118,80,0.16)] bg-[#EEE4DE] px-4 py-6 ${
                      transcriptLines.length > 0 ? "justify-start" : "justify-center"
                    }`}
                  >
                    {transcriptLines.length === 0 ? (
                      <p className="text-center text-[13px] italic leading-relaxed text-[#8A7B6E]">
                        {transcriptPlaceholder}
                      </p>
                    ) : (
                      <ul className="divide-y divide-black/[0.08] text-[13px]">
                        {transcriptLines.map((line, i) => {
                          const lineRole = transcriptSpeakerRole(line, i);
                          const body = stripTranscriptSpeakerPrefix(line);
                          const isNew = i === transcriptLines.length - 1;
                          return (
                            <li
                              key={`${i}-${line.slice(0, 32)}`}
                              className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${isNew ? "transcript-line-new" : ""}`}
                            >
                              <span
                                className={`w-16 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  lineRole === "agent" ? "text-[#2C1A12]" : "text-[#8A7B6E]"
                                }`}
                              >
                                {lineRole === "agent" ? "You" : "Caller"}
                              </span>
                              <p className="min-w-0 flex-1 whitespace-pre-wrap leading-relaxed text-[#2C1A12]">
                                {body}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              </div>

              <div className="flex min-w-0 flex-col gap-[1.1rem]">
                <section className="flex flex-col rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Sparkles size={16} className="shrink-0 text-[#8B5E3C]" aria-hidden />
                      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">
                        AI COACHING — LIVE
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={onRegenerateCoaching}
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#8B5E3C] bg-transparent px-2.5 py-1 text-[13px] font-medium text-[#8B5E3C] transition hover:bg-[#8B5E3C]/10"
                    >
                      <RefreshCw size={14} strokeWidth={1.5} aria-hidden />
                      Regenerate
                    </button>
                  </div>
                  <h3
                    className="text-[18px] italic leading-snug text-[#120D06]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    What to Say Now
                  </h3>
                  <div className="mt-2 min-h-[1.25rem]">{coachingStatusSlot}</div>
                  <div className="mt-3 flex min-h-[10rem] max-h-[16rem] flex-col justify-center overflow-y-auto break-words rounded-[10px] border border-[rgba(150,118,80,0.16)] bg-[#EEE4DE] px-4 py-6">
                    {coachingBody}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-black/[0.08] pt-3">
                    <button
                      type="button"
                      onClick={() => void copyScript()}
                      disabled={!coachText.trim()}
                      className="rounded-full bg-[#9A5E1A] px-5 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(184,115,51,0.28)] transition hover:bg-[#a06028] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copyFeedback ? "Copied" : "Copy Script"}
                    </button>
                  </div>
                  <div className="mt-3 border-t border-black/[0.08] pt-3">
                    <button
                      type="button"
                      onClick={() => setBackupOpen((o) => !o)}
                      className="flex w-full items-center justify-between gap-2 text-left text-[13px] font-medium text-[#8A7B6E] transition hover:text-[#2C1A12]"
                    >
                      <span>Supporting response suggestions</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[#8A7B6E] transition-transform ${backupOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {backupOpen ? (
                      <p className="mt-3 text-[13px] leading-relaxed text-[#8A7B6E]">
                        No alternate responses are configured yet. Templates will appear here when available.
                      </p>
                    ) : null}
                  </div>
                </section>
                <SentimentCard
                  headline={sentimentHeadline}
                  callerTonePct={sentimentBars.callerTonePct}
                  agentCalmPct={sentimentBars.agentCalmPct}
                  resolutionPct={sentimentBars.resolutionPct}
                />
                <BoundaryShieldStatus
                  isActiveCall={callActive || isActiveCall}
                  conversationState={conversationState}
                  riskSignals={riskSignals}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {role === "manager" && (
        <>
          <div className="mt-4 rounded-lg border border-[#E2D8CC] bg-[#EDE7DF] p-6 text-[#2C1A12]">
            {transferData ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E6DED6] bg-[#F7F2EC] px-4 py-3">
                  <div className="text-[13px] font-medium text-[#2C1A12]">
                    Transfer incoming — Pre-Call Armor loaded
                  </div>
                  <div className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-800">
                    HIGH RISK
                  </div>
                </div>

                <div className="manager-grid">
                  <div className="rounded-lg border border-[#E2D8CC] bg-[#F5F0EB] p-4">
                    <h3 className="mb-3 text-base font-semibold text-[#2C1A12]">Transfer Brief</h3>
                    <div className="row">
                      <span className="label">Caller</span>
                      <span className="value">{transferData?.phone ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Handled by</span>
                      <span className="value">{transferData?.agent ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Issue</span>
                      <span className="value">{transferData?.summary ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Risk</span>
                      <span className="value">{transferData?.escalation_level ?? "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E2D8CC] bg-[#F5F0EB] p-4">
                    <h3 className="mb-3 text-base font-semibold text-[#2C1A12]">Open with this</h3>
                    <div className="response-box">
                      {coachText ? `“${coachText}”` : "AI is listening to the conversation..."}
                    </div>
                    <p className="mt-3 text-[13px] text-[#6f6257]">
                      The customer does not need to repeat themselves. CalmLine already understands the
                      situation.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-[13px] text-[#8A7B6E]">Waiting for transfer...</div>
            )}
          </div>
        </>
      )}
      {role === "admin" && (
        <>
          <div className="mt-4 rounded-lg border border-[#E2D8CC] bg-[#EDE7DF] p-6 text-[#2C1A12]">
            <h3 className="mb-4 text-base font-semibold text-[#2C1A12]">Policy Upload</h3>

            <div className="mb-3 rounded-lg border border-[#E2D8CC] bg-[#F5F0EB] px-4 py-3 text-[13px] text-[#6f6257]">
              Upload policy documents (PDF, DOCX)
            </div>

            <div className="rounded-lg border border-[#E2D8CC] bg-[#F5F0EB] px-4 py-3 text-[13px] text-[#6f6257]">
              Active policies list
            </div>
          </div>
        </>
      )}
      <style jsx>{`
        .manager-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
        }

        .divider {
          height: 1px;
          background: #e2d8cc;
          margin: 2px 0;
        }

        .label {
          color: #6f6257;
          font-size: 12px;
        }

        .value {
          color: #2b211c;
          font-size: 14px;
          text-align: right;
        }

        .response-box {
          background: #efe7df;
          border-radius: 0.5rem;
          border: 1px solid #e2d8cf;
          padding: 16px;
          color: #2b1d1d;
          line-height: 1.6;
          border-left: 3px solid #a56a2a;
        }

        .precall-card {
          background: #fefcf8;
          border: 1px solid rgba(150, 118, 80, 0.16);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .precall-header {
          font-size: 13px;
          color: rgba(18, 13, 6, 0.45);
          margin-bottom: 8px;
        }

        .precall-row {
          font-size: 14px;
          color: #120d06;
          margin-bottom: 4px;
        }

        .precall-note {
          margin-top: 8px;
          font-size: 13px;
          color: rgba(18, 13, 6, 0.55);
        }

        .empty-state {
          color: rgba(18, 13, 6, 0.45);
          font-size: 14px;
          text-align: center;
          padding: 40px 0;
        }

        @keyframes transferFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <style jsx global>{`
        .transcript-line-new {
          animation: transcriptLineIn 0.45s ease-out forwards;
        }
        @keyframes transcriptLineIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
