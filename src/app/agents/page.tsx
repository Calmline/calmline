"use client";

import { useState, useEffect } from "react";
import type { AgentPerformance } from "@/app/api/agents/route";

function statusLabel(s: AgentPerformance["status"]) {
  switch (s) {
    case "available":
      return "Available";
    case "busy":
      return "Busy";
    case "offline":
      return "Offline";
    default:
      return s;
  }
}

function statusBadgeClass(s: AgentPerformance["status"]) {
  switch (s) {
    case "available":
      return "bg-emerald-100 text-emerald-800";
    case "busy":
      return "bg-amber-100 text-amber-800";
    case "offline":
      return "bg-neutral-100 text-neutral-600";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    fetch("/api/agents")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load agents");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.agents)) setAgents(data.agents);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCalls = agents.reduce((s, a) => s + a.callsHandled, 0);
  const avgRisk =
    agents.length > 0
      ? Math.round(
          agents.reduce((s, a) => s + a.avgEscalationRisk, 0) / agents.length
        )
      : 0;
  const avgDeEscalation =
    agents.length > 0
      ? Math.round(
          agents.reduce((s, a) => s + a.deEscalationRate, 0) / agents.length
        )
      : 0;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Agents
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Performance intelligence and team overview
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <p className="text-sm text-neutral-500">Loading agents…</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-medium text-neutral-900">
            No agents yet
          </h2>
          <p className="mt-2 max-w-sm mx-auto text-sm text-neutral-500">
            Agent performance data will appear here when your team is connected.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Total calls (team)
              </p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900 tabular-nums">
                {totalCalls}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Avg. escalation risk
              </p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900 tabular-nums">
                {avgRisk}%
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Avg. de-escalation rate
              </p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900 tabular-nums">
                {avgDeEscalation}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-800">
                Team agents
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Performance metrics per agent
              </p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {agent.name}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        {agent.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <span className="text-sm text-neutral-500">
                      {agent.role}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(agent.status)}`}
                    >
                      {statusLabel(agent.status)}
                    </span>
                    <span className="text-sm tabular-nums text-neutral-600">
                      {agent.callsHandled} calls
                    </span>
                    <span className="text-sm tabular-nums text-neutral-600">
                      {agent.avgEscalationRisk}% risk
                    </span>
                    <span className="text-sm tabular-nums text-neutral-600">
                      {agent.deEscalationRate}% de-escalated
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatTime(agent.lastActiveAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
