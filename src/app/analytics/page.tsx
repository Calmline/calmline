"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

type RiskAnalytics = {
  totalCalls: number;
  escalationRate: number;
  avgEscalationRisk: number;
  avgComplaintRisk: number;
  escalationDistribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  trend: { date: string; avgRisk: number }[];
  topTriggers: { trigger: string; count: number }[];
};

function SkeletonCard() {
  return (
    <Card className="hover:!translate-y-0">
      <div className="h-4 w-24 animate-pulse rounded bg-white/[0.08]" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-white/[0.08]" />
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card className="hover:!translate-y-0">
      <div className="h-5 w-40 animate-pulse rounded bg-white/[0.08]" />
      <div className="mt-6 flex h-48 items-end justify-between gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-white/[0.06]"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </Card>
  );
}

function BurnoutLabel(escalationRate: number, avgRisk: number) {
  const score = escalationRate * 0.6 + (avgRisk / 100) * 40;
  if (score >= 40) return { label: "High", color: "text-red-300", bg: "bg-red-950/40 border-red-500/20" };
  if (score >= 20) return { label: "Elevated", color: "text-amber-300", bg: "bg-amber-950/30 border-amber-500/20" };
  return { label: "Low", color: "text-emerald-300", bg: "bg-emerald-950/30 border-emerald-500/20" };
}

export default function RiskAnalyticsPage() {
  const [data, setData] = useState<RiskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/risk-analytics")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div>
        <div className="rounded-[10px] border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#E6EEF6]">Risk Analytics</h1>
        <p className="mt-1 text-[#9FB3C8]">Last 30 days</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="mt-8">
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const d = data!;
  const burnout = BurnoutLabel(d.escalationRate, d.avgEscalationRisk);
  const totalEvents =
    d.escalationDistribution.low +
    d.escalationDistribution.moderate +
    d.escalationDistribution.high +
    d.escalationDistribution.critical;
  const maxTrend = Math.max(1, ...d.trend.map((t) => t.avgRisk));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#E6EEF6]">Risk Analytics</h1>
      <p className="mt-1 text-[#9FB3C8]">Last 30 days · Executive summary</p>

      {d.totalCalls === 0 ? (
        <Card className="mt-10 p-12 text-center hover:!translate-y-0">
          <p className="text-[#9FB3C8]">No call events in the last 30 days.</p>
          <p className="mt-1 text-sm text-[#6B859F]">
            Run live sessions to see escalation and risk metrics here.
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:!translate-y-0">
              <p className="text-sm font-medium text-[#9FB3C8]">Total Calls</p>
              <p className="mt-1 text-2xl font-semibold text-[#E6EEF6]">{d.totalCalls}</p>
            </Card>
            <Card className="hover:!translate-y-0">
              <p className="text-sm font-medium text-[#9FB3C8]">Escalation Rate</p>
              <p className="mt-1 text-2xl font-semibold text-[#E6EEF6]">
                {d.escalationRate}%{" "}
                <span className="text-sm font-normal text-[#9FB3C8]">(High + Critical)</span>
              </p>
            </Card>
            <Card className="hover:!translate-y-0">
              <p className="text-sm font-medium text-[#9FB3C8]">Avg Escalation Risk</p>
              <p className="mt-1 text-2xl font-semibold text-[#E6EEF6]">{d.avgEscalationRisk}%</p>
            </Card>
            <Card className={`border ${burnout.bg} hover:!translate-y-0`}>
              <p className="text-sm font-medium text-[#9FB3C8]">Burnout Risk</p>
              <p className={`mt-1 text-2xl font-semibold ${burnout.color}`}>{burnout.label}</p>
            </Card>
          </div>

          <Card className="mt-8 hover:!translate-y-0">
            <h2 className="text-lg font-semibold text-[#E6EEF6]">Escalation trend</h2>
            <p className="mt-0.5 text-sm text-[#9FB3C8]">Average escalation risk by day</p>
            <div className="mt-6 flex h-52 items-end justify-between gap-0.5">
              {d.trend.map(({ date, avgRisk }) => (
                <div
                  key={date}
                  className="flex flex-1 flex-col items-center"
                  title={`${date}: ${Math.round(avgRisk)}%`}
                >
                  <div
                    className="w-full min-w-[4px] rounded-t bg-[#1FD6A6]/80 transition-all"
                    style={{
                      height: `${maxTrend ? (avgRisk / maxTrend) * 100 : 0}%`,
                      minHeight: avgRisk > 0 ? "4px" : "0",
                    }}
                  />
                  <span className="mt-1 truncate text-[10px] text-[#6B859F]">
                    {date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card className="hover:!translate-y-0">
              <h2 className="text-lg font-semibold text-[#E6EEF6]">Escalation distribution</h2>
              <p className="mt-0.5 text-sm text-[#9FB3C8]">Event count by level</p>
              <div className="mt-6 space-y-4">
                {[
                  { key: "low" as const, label: "Low", color: "bg-emerald-500" },
                  { key: "moderate" as const, label: "Moderate", color: "bg-amber-500" },
                  { key: "high" as const, label: "High", color: "bg-red-500" },
                  { key: "critical" as const, label: "Critical", color: "bg-red-700" },
                ].map(({ key, label, color }) => {
                  const count = d.escalationDistribution[key];
                  const pct = totalEvents ? (100 * count) / totalEvents : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[#E6EEF6]">{label}</span>
                        <span className="text-[#9FB3C8]">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="hover:!translate-y-0">
              <h2 className="text-lg font-semibold text-[#E6EEF6]">Top risk drivers</h2>
              <p className="mt-0.5 text-sm text-[#9FB3C8]">Most frequent triggers (last 30 days)</p>
              {d.topTriggers.length === 0 ? (
                <p className="mt-6 text-sm text-[#9FB3C8]">No triggers recorded.</p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {d.topTriggers.map(({ trigger, count }, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2"
                    >
                      <span className="text-sm font-medium text-[#E6EEF6]">{trigger}</span>
                      <span className="text-sm text-[#9FB3C8]">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
