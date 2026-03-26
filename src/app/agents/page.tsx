"use client";

import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

function statusBadgeClass(status: "available" | "busy" | "offline") {
  switch (status) {
    case "available":
      return "bg-emerald-500/15 text-emerald-300";
    case "busy":
      return "bg-amber-500/15 text-amber-300";
    case "offline":
    default:
      return "bg-white/[0.08] text-[#9FB3C8]";
  }
}

function MetricCard({ title }: { title: string }) {
  return (
    <Card className="!rounded-xl !border-white/[0.08] !p-5 hover:!translate-y-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9FB3C8]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#E6EEF6]">—</p>
      <p className="mt-1 text-xs text-[#9FB3C8]">Data will appear as activity is recorded</p>
    </Card>
  );
}

export default function AgentsPage() {
  return (
    <div className="block w-full pb-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Team</h1>
          <p className="mt-2 text-sm text-[#9FB3C8]">
            Overview of active agents and operational status
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#E6EEF6] transition hover:bg-white/[0.06]"
        >
          Add agent
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total calls" />
        <MetricCard title="Escalation rate" />
        <MetricCard title="De-escalation rate" />
      </div>

      <Card className="mt-8 !rounded-xl !border-white/[0.08] !p-0 overflow-hidden hover:!translate-y-0">
        <div className="border-b border-white/[0.06] px-6 py-5">
          <h2 className="text-base font-semibold text-[#E6EEF6]">Team members</h2>
          <p className="mt-1 text-sm text-[#9FB3C8]">Active agents and current status</p>
        </div>

        <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-3">
          <div className="grid grid-cols-7 gap-4 text-[11px] font-semibold uppercase tracking-wide text-[#9FB3C8]">
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-[#9FB3C8]">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-base font-medium text-[#E6EEF6]">No agents yet</p>
          <p className="mt-2 max-w-sm text-sm text-[#9FB3C8]">
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
