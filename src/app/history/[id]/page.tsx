"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type CallSession = {
  id: string;
  session_id: string | null;
  transcript: string;
  ai_response: string;
  tone: string | null;
  escalation_risk: string | null;
  created_at: string;
  ended_at: string | null;
  call_duration: number | null;
  caller_number: string | null;
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  } catch {
    return String(s);
  }
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [session, setSession] = useState<CallSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch("/api/call-history")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.sessions) ? data.sessions : [];
        const found = list.find((s: CallSession) => s.id === id);
        setSession(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">Session not found.</p>
        <Link href="/history" className="text-slate-600 underline hover:text-slate-900">Back to History</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Call detail</h1>
        <Link href="/history" className="text-slate-600 underline hover:text-slate-900">← History</Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid gap-2 text-sm">
          <p><span className="text-slate-500">Session ID:</span> {session.session_id ?? session.id}</p>
          <p><span className="text-slate-500">Created:</span> {formatDate(session.created_at)}</p>
          <p><span className="text-slate-500">Ended:</span> {formatDate(session.ended_at)}</p>
          <p><span className="text-slate-500">Duration:</span> {session.call_duration != null ? `${session.call_duration}s` : "—"}</p>
          <p><span className="text-slate-500">Caller:</span> {session.caller_number ?? "—"}</p>
          <p><span className="text-slate-500">Tone:</span> {session.tone ?? "—"}</p>
          <p><span className="text-slate-500">Risk:</span> {session.escalation_risk ?? "—"}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-700">Transcript</h2>
          <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-700">
            {session.transcript || "(none)"}
          </pre>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-700">AI response</h2>
          <p className="mt-1 text-sm text-slate-700">{session.ai_response || "(none)"}</p>
        </div>
      </div>
    </div>
  );
}
