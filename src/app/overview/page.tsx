"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";

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

export default function OverviewPage() {
  const subline = `${formatHeaderDate()} · Your activity will appear here once calls are active`;

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Top header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">{GREETING_LINE}</h1>
          <p className="mt-1 text-sm text-[#9FB3C8]">{subline}</p>
        </div>
        <div className="relative shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-sm font-semibold text-[#E6EEF6] ring-1 ring-white/[0.08]"
            aria-hidden
          >
            {AVATAR_INITIALS}
          </div>
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0B141F] bg-[#1FD6A6]"
            title="Available"
            aria-hidden
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-xl font-bold text-[#E6EEF6]">—</p>
          <p className="mt-1 text-sm text-[#9FB3C8]">Status will update during active sessions</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[#9FB3C8]">Calls today</p>
          <p className="mt-1 text-xl font-bold text-[#E6EEF6]">—</p>
          <p className="mt-1 text-sm text-[#9FB3C8]">Calls will appear once activity begins</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[#9FB3C8]">Avg handle time</p>
          <p className="mt-1 text-xl font-bold text-[#E6EEF6]">—</p>
          <p className="mt-1 text-sm text-[#9FB3C8]">Average will calculate automatically</p>
        </Card>
        <Card className="!p-6 hover:!translate-y-0">
          <p className="text-sm text-[#9FB3C8]">CSAT today</p>
          <p className="mt-1 text-xl font-bold text-[#E6EEF6]">—</p>
          <p className="mt-1 text-sm text-[#9FB3C8]">Customer feedback will populate here</p>
        </Card>
      </div>

      {/* Main grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Today's calls */}
        <Card className="flex flex-col !p-6 hover:!translate-y-0">
          <CardHeader className="mb-0">
            <h2 className="text-lg font-semibold text-[#E6EEF6]">Today&apos;s calls</h2>
          </CardHeader>
          <CardContent className="mt-3">
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-6 py-8 text-center">
              <p className="text-base font-medium text-[#E6EEF6]">No calls yet</p>
              <p className="mt-2 max-w-sm text-sm text-[#9FB3C8]">
                Your active and completed calls will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-8">
          <Card className="!p-6 hover:!translate-y-0">
            <CardHeader className="mb-0">
              <h2 className="text-lg font-semibold text-[#E6EEF6]">Activity timeline</h2>
            </CardHeader>
            <CardContent className="mt-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-sm leading-relaxed text-[#9FB3C8]">
                  Your call activity will appear here throughout your shift
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="!p-6 hover:!translate-y-0">
            <CardHeader className="mb-0">
              <h2 className="text-lg font-semibold text-[#E6EEF6]">Next in queue</h2>
            </CardHeader>
            <CardContent className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-[#E6EEF6]">No incoming calls</p>
                <p className="mt-1 text-sm text-[#9FB3C8]">
                  When a call is available, it will appear here
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed rounded-[10px] bg-white/[0.08] px-5 py-2 text-sm font-medium text-[#9FB3C8]"
                >
                  Answer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
