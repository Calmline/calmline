"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useDashboardView } from "@/context/DashboardViewContext";

const GREETING_LINE = "Good afternoon, Kyra";
const AVATAR_INITIALS = "KY";

function formatHeaderDate(): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  } catch {
    return "Tuesday, March 24";
  }
}

function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-[#120D06]">Organization Overview</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">Total Agents</p>
          <p className="mt-1 text-xl font-semibold text-[#120D06]">—</p>
        </Card>
        <Card className="hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">Active Policies</p>
          <p className="mt-1 text-xl font-semibold text-[#120D06]">—</p>
        </Card>
        <Card className="hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">Compliance Status</p>
          <p className="mt-1 text-xl font-semibold text-[#120D06]">—</p>
        </Card>
      </div>

      <Card className="hover:!translate-y-0">
        <p className="text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          Recent activity and organization insights will appear here.
        </p>
      </Card>
    </div>
  );
}

function AgentDashboard() {
  return (
    <>
      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-xl font-bold text-[#120D06]">—</p>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">Status will update during active sessions</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">Calls today</p>
          <p className="mt-1 text-xl font-bold text-[#120D06]">—</p>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">Calls will appear once activity begins</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">Avg handle time</p>
          <p className="mt-1 text-xl font-bold text-[#120D06]">—</p>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">Average will calculate automatically</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[rgba(18,13,6,0.45)]">CSAT today</p>
          <p className="mt-1 text-xl font-bold text-[#120D06]">—</p>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">Customer feedback will populate here</p>
        </Card>
      </div>

      {/* Main grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Today's calls */}
        <Card className="flex flex-col !p-6 hover:!translate-y-0">
          <CardHeader className="mb-0">
            <h2 className="text-lg font-semibold text-[#120D06]">Today&apos;s calls</h2>
          </CardHeader>
          <CardContent className="mt-3">
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-6 py-8 text-center">
              <p className="text-base font-medium text-[#120D06]">No calls yet</p>
              <p className="mt-2 max-w-sm text-sm text-[rgba(18,13,6,0.45)]">
                Your active and completed calls will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-8">
          <Card className="!p-6 hover:!translate-y-0">
            <CardHeader className="mb-0">
              <h2 className="text-lg font-semibold text-[#120D06]">Activity timeline</h2>
            </CardHeader>
            <CardContent className="mt-3">
              <div className="rounded-xl border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-5">
                <p className="text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
                  Your call activity will appear here throughout your shift
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="!p-6 hover:!translate-y-0">
            <CardHeader className="mb-0">
              <h2 className="text-lg font-semibold text-[#120D06]">Next in queue</h2>
            </CardHeader>
            <CardContent className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-[#120D06]">No incoming calls</p>
                <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">
                  When a call is available, it will appear here
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed rounded-[10px] bg-[#EEE4DE] px-5 py-2 text-sm font-medium text-[rgba(18,13,6,0.45)]"
                >
                  Answer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function OverviewPage() {
  const { view, setView } = useDashboardView();
  const subline = `${formatHeaderDate()} · Your activity will appear here once calls are active`;

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Top header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(150,118,80,0.12)] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">{GREETING_LINE}</h1>
          <p className="mt-1 text-sm text-[rgba(18,13,6,0.45)]">{subline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(150,118,80,0.16)] bg-[#EEE4DE] p-1">
            <button
              type="button"
              onClick={() => setView("agent")}
              className={`rounded-md px-3 py-1 text-sm ${
                view === "agent" ? "bg-[#9A5E1A] text-white" : "text-[rgba(18,13,6,0.55)]"
              }`}
            >
              Agent
            </button>
            <button
              type="button"
              onClick={() => setView("admin")}
              className={`rounded-md px-3 py-1 text-sm ${
                view === "admin" ? "bg-[#9A5E1A] text-white" : "text-[rgba(18,13,6,0.55)]"
              }`}
            >
              Admin
            </button>
          </div>
          <div className="relative shrink-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#D8BEA8] to-[#C8A880] text-sm font-semibold text-[#120D06] ring-1 ring-[rgba(150,118,80,0.2)]"
              aria-hidden
            >
              {AVATAR_INITIALS}
            </div>
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FEFCF8] bg-[#4E7A5E]"
              title="Available"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {view === "agent" ? <AgentDashboard /> : <AdminDashboard />}
    </div>
  );
}
