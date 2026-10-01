"use client";

import { useState } from "react";

/** TEMPORARY — delete this component when Boundary Shield test mode is no longer needed. */

const EXAMPLES = [
  "This billing is ridiculous and I want a refund.",
  "You're an idiot. Fix this refund now.",
  "Fuck you. Fix my login.",
  "This bill is wrong. I'm going to kill you.",
];

export function BoundaryShieldTestPanel() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/dev/boundary-shield-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        abusiveDetected?: boolean;
        severity?: string;
        allowTerminationScript?: boolean;
        reset?: boolean;
      };
      if (!res.ok || data.ok === false) {
        setStatus(data.error ?? `Request failed (${res.status})`);
        return;
      }
      if (data.reset) {
        setStatus("Test session cleared. Submit another phrase.");
        return;
      }
      const detect = data.abusiveDetected
        ? `Detected (${data.severity}; script ${data.allowTerminationScript ? "allowed" : "not allowed"})`
        : "Not detected (frustration / undirected)";
      setStatus(detect);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-4 rounded-xl border border-dashed border-[rgba(154,94,26,0.35)] bg-[#FEFCF8] p-4 shadow-[0_2px_10px_rgba(100,70,30,0.06)]"
      aria-label="Boundary Shield test mode"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">
        Dev only · Boundary Shield test
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#120D06]/55">
        Sends a caller phrase through the realtime gateway classifier and the live websocket.
        Gateway must be running on port 8787. Remove this panel when testing is done.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Type a caller phrase, then submit"
        className="mt-3 w-full resize-y rounded-[10px] border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-3 py-2 text-[13px] text-[#2C1A12] outline-none focus:border-[#9A5E1A]"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setText(example)}
            className="rounded-full border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] px-2.5 py-1 text-[11px] text-[#120D06]/70 transition hover:border-[#9A5E1A] hover:text-[#2C1A12]"
          >
            {example.length > 42 ? `${example.slice(0, 42)}…` : example}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void post({ text })}
          className="rounded-full bg-[#9A5E1A] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#a06028] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Sending…" : "Submit as caller"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void post({ reset: true })}
          className="rounded-full border border-[rgba(150,118,80,0.26)] px-4 py-1.5 text-[13px] font-medium text-[#120D06]/70 transition hover:border-[#9A5E1A] hover:text-[#2C1A12] disabled:opacity-40"
        >
          Reset test session
        </button>
      </div>
      {status ? (
        <p className="mt-2 text-[12px] text-[#120D06]/55">{status}</p>
      ) : null}
    </section>
  );
}
