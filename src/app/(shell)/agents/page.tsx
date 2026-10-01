"use client";

import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

function statusBadgeClass(status: "available" | "busy" | "offline") {
  switch (status) {
    case "available":
      return "bg-[rgba(78,122,94,0.1)] text-[#4E7A5E]";
    case "busy":
      return "bg-[rgba(168,120,40,0.12)] text-[#A87828]";
    case "offline":
    default:
      return "bg-[#EEE4DE] text-[rgba(18,13,6,0.45)]";
  }
}

function MetricCard({ title }: { title: string }) {
  return (
    <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-5 hover:!translate-y-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(18,13,6,0.45)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#120D06]">—</p>
      <p className="mt-1 text-xs text-[rgba(18,13,6,0.45)]">Data will appear as activity is recorded</p>
    </Card>
  );
}

export default function AgentsPage() {
  return (
    <div className="block w-full pb-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Team</h1>
          <p className="mt-2 text-sm text-[rgba(18,13,6,0.45)]">
            Overview of active agents and operational status
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] px-4 py-2 text-sm font-medium text-[#120D06] transition hover:bg-[#EEE4DE]"
        >
          Add agent
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total calls" />
        <MetricCard title="Escalation rate" />
        <MetricCard title="De-escalation rate" />
      </div>

      <Card className="mt-8 !rounded-xl !border-[rgba(150,118,80,0.16)] !p-0 overflow-hidden hover:!translate-y-0">
        <div className="border-b border-[rgba(150,118,80,0.12)] px-6 py-5">
          <h2 className="text-base font-semibold text-[#120D06]">Team members</h2>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">Active agents and current status</p>
        </div>

        <div className="border-b border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-6 py-3">
          <div className="grid grid-cols-7 gap-4 text-[11px] font-semibold uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span>Activity</span>
            <span>Risk</span>
            <span>Performance</span>
            <span>Last active</span>
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEE4DE] text-[rgba(18,13,6,0.45)]">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-base font-medium text-[#120D06]">No agents yet</p>
          <p className="mt-2 max-w-sm text-sm text-[rgba(18,13,6,0.45)]">
            Agents will appear here once your team is active
          </p>

          <div className="mt-6 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass("available")}`}
            >
              Available
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass("busy")}`}>
              Busy
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass("offline")}`}
            >
              Offline
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
