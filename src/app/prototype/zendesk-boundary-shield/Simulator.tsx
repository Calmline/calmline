"use client";

import { useEffect, useRef, useState } from "react";
import { AgentWarningDialog } from "@/components/boundary-shield/AgentWarningDialog";
import { BoundaryShieldSessionStore } from "@/lib/boundary-shield/engine";
import { SYNTHETIC_CALLS } from "@/lib/boundary-shield/syntheticCalls";
import { ZENDESK_VOICE_INTEGRATION } from "@/lib/boundary-shield/zendeskAdapter";
import type { AgentAction, BoundaryShieldAlert, CallBoundaryState } from "@/lib/boundary-shield/types";

const STEP_MS = 900;

export function ZendeskBoundaryShieldSimulator() {
  const storeRef = useRef(new BoundaryShieldSessionStore());
  const [scenarioId, setScenarioId] = useState(SYNTHETIC_CALLS[0].id);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [states, setStates] = useState<CallBoundaryState[]>([]);
  const [openAlert, setOpenAlert] = useState<BoundaryShieldAlert | null>(null);
  const [status, setStatus] = useState("Choose a synthetic call, then play or step through it.");

  const scenario = SYNTHETIC_CALLS.find((item) => item.id === scenarioId) ?? SYNTHETIC_CALLS[0];

  function refresh(alert: BoundaryShieldAlert | null) {
    const nextStates = Array.from(new Set(scenario.segments.map((item) => item.conversationId)))
      .map((id) => storeRef.current.getState(id))
      .filter((state): state is CallBoundaryState => state !== null);
    setStates(nextStates);
    if (alert) setOpenAlert(alert);
  }

  function reset(nextScenarioId = scenarioId) {
    storeRef.current = new BoundaryShieldSessionStore();
    setScenarioId(nextScenarioId);
    setCursor(0);
    setPlaying(false);
    setStates([]);
    setOpenAlert(null);
    setStatus("Ready. No external services are contacted.");
  }

  function step() {
    const current = SYNTHETIC_CALLS.find((item) => item.id === scenarioId) ?? scenario;
    if (cursor >= current.segments.length) {
      setPlaying(false);
      setStatus("Call finished.");
      return false;
    }
    const next = current.segments[cursor];
    const result = storeRef.current.ingest(next);
    setCursor((value) => value + 1);
    refresh(result.alert);
    if (result.alert) {
      setPlaying(false);
      setStatus(`${result.alert.title} on ${result.alert.conversationId}. Choose an option in the warning.`);
      return false;
    }
    if (result.duplicate) setStatus("Duplicate event ignored.");
    else if (result.ignoredSpeaker) setStatus("Agent or system line recorded. No customer alert.");
    else setStatus("No boundary alert.");
    return cursor + 1 < current.segments.length;
  }

  useEffect(() => {
    if (!playing || openAlert) return;
    const timer = window.setTimeout(() => {
      const more = step();
      if (!more) setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
    // step closes over the latest cursor and scenario on each tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, cursor, openAlert, scenarioId]);

  function onAction(action: AgentAction, alert: BoundaryShieldAlert) {
    const store = storeRef.current;
    if (action === "acknowledge") store.acknowledge(alert.conversationId, alert.id);
    if (action === "continue") store.continueCall(alert.conversationId);
    if (action === "request_supervisor_review") store.requestSupervisorReview(alert.conversationId);
    setOpenAlert(null);
    refresh(null);
    const labels = {
      acknowledge: "Acknowledged. The warning ladder stays where it is.",
      continue: "Call continues. Another abusive line can still raise the next warning.",
      request_supervisor_review: "Supervisor review requested. This prototype does not contact Zendesk.",
    };
    setStatus(labels[action]);
    if (action !== "request_supervisor_review" && cursor < scenario.segments.length) setPlaying(true);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 text-[#120D06]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A5E1A]">Calmline prototype</p>
      <h1 className="mt-2 font-serif text-3xl text-[#2C1A12]">Zendesk Voice Boundary Shield</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#120D06]/70">
        Simulated phone transcripts for a future Zendesk Support ticket sidebar. {ZENDESK_VOICE_INTEGRATION.limitation}
      </p>
      <p className="mt-3 text-sm">
        <a className="font-semibold text-[#9A5E1A] underline" href="/zendesk-app/iframe.html">
          Open the Zendesk ticket-sidebar demo
        </a>
      </p>

      <section className="mt-6 rounded-2xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4" aria-label="Simulation controls">
        <label htmlFor="scenario" className="text-xs font-semibold uppercase tracking-wide text-[#120D06]/50">
          Synthetic conversation
        </label>
        <select
          id="scenario"
          value={scenarioId}
          onChange={(event) => reset(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] px-3 py-2 text-sm"
        >
          {SYNTHETIC_CALLS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-[#120D06]/65">{scenario.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (cursor >= scenario.segments.length) reset(scenarioId);
              setPlaying(true);
            }}
            className="rounded-full bg-[#9A5E1A] px-4 py-2 text-sm font-semibold text-white"
          >
            Play
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              step();
            }}
            className="rounded-full border border-[rgba(150,118,80,0.26)] px-4 py-2 text-sm font-semibold"
          >
            Step
          </button>
          <button
            type="button"
            onClick={() => reset(scenarioId)}
            className="rounded-full border border-[rgba(150,118,80,0.26)] px-4 py-2 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
        <p className="mt-3 text-sm" role="status">
          {status}
        </p>
        <p className="mt-1 text-xs text-[#120D06]/45">
          Line {Math.min(cursor, scenario.segments.length)} of {scenario.segments.length}
        </p>
      </section>

      <section className="mt-4 space-y-4" aria-label="Call state">
        {states.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[rgba(150,118,80,0.25)] px-4 py-8 text-center text-sm text-[#120D06]/50">
            The transcript will appear here.
          </p>
        ) : (
          states.map((state) => (
            <article key={state.conversationId} className="rounded-2xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{state.conversationId}</h2>
                <p className="text-xs font-medium uppercase tracking-wide text-[#9A5E1A]">
                  Ladder: {state.rung.replaceAll("_", " ")}
                </p>
              </div>
              <p className="mt-1 text-xs text-[#120D06]/50">
                Hostile customer lines: {state.hostileCount}
                {state.supervisorReviewRequested ? " · Supervisor review requested" : ""}
              </p>
              <ol className="mt-3 space-y-2" aria-live="polite" aria-relevant="additions">
                {state.segments.map((item) => (
                  <li key={item.segmentId} className="rounded-xl bg-[#F7F2EA] px-3 py-2 text-sm">
                    <span className="font-semibold capitalize">{item.speaker}: </span>
                    {item.text}
                  </li>
                ))}
              </ol>
            </article>
          ))
        )}
      </section>

      <AgentWarningDialog alert={openAlert} onAction={onAction} />
    </main>
  );
}
