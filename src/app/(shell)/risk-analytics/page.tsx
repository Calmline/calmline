"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

type RiskAnalyticsData = {
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

export default function RiskAnalyticsPage() {
  const [data, setData] = useState<RiskAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/risk-analytics", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? `HTTP ${res.status}`
          );
        }
        const json = (await res.json()) as RiskAnalyticsData;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = !loading && !error && data !== null && data.totalCalls === 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#120D06]">
        Risk Analytics
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[rgba(18,13,6,0.45)]">
          Loading analytics…
        </div>
      )}

      {error && (
        <div className="rounded-[10px] border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isEmpty && (
        <Card className="px-4 py-6 text-center hover:!translate-y-0">
          <p className="text-[rgba(18,13,6,0.45)]">
            No analytics data yet. Data will appear as calls are processed.
          </p>
        </Card>
      )}

      {!loading && !error && (data === null || data.totalCalls > 0) && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-medium text-[rgba(18,13,6,0.45)]">
              KPI Summary
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="!p-4 hover:!translate-y-0">
                <p className="text-sm text-[rgba(18,13,6,0.45)]">Total Calls</p>
                <p className="mt-1 text-xl font-semibold text-[#120D06]">
                  {data?.totalCalls ?? "—"}
                </p>
              </Card>
              <Card className="!p-4 hover:!translate-y-0">
                <p className="text-sm text-[rgba(18,13,6,0.45)]">Escalation Rate</p>
                <p className="mt-1 text-xl font-semibold text-[#120D06]">
                  {data != null ? `${data.escalationRate}%` : "—"}
                </p>
              </Card>
              <Card className="!p-4 hover:!translate-y-0">
                <p className="text-sm text-[rgba(18,13,6,0.45)]">Avg Escalation Risk</p>
                <p className="mt-1 text-xl font-semibold text-[#120D06]">
                  {data != null ? data.avgEscalationRisk.toFixed(1) : "—"}
                </p>
              </Card>
              <Card className="!p-4 hover:!translate-y-0">
                <p className="text-sm text-[rgba(18,13,6,0.45)]">Avg Complaint Risk</p>
                <p className="mt-1 text-xl font-semibold text-[#120D06]">
                  {data != null ? data.avgComplaintRisk.toFixed(1) : "—"}
                </p>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-[rgba(18,13,6,0.45)]">
              Escalation Trend
            </h2>
            <Card
              className="flex h-64 items-center justify-center hover:!translate-y-0"
              aria-hidden
            >
              <span className="text-sm text-[rgba(18,13,6,0.45)]">Chart placeholder</span>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-[rgba(18,13,6,0.45)]">
              Escalation Distribution
            </h2>
            <Card
              className="flex h-48 items-center justify-center hover:!translate-y-0"
              aria-hidden
            >
              <span className="text-sm text-[rgba(18,13,6,0.45)]">Distribution placeholder</span>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-[rgba(18,13,6,0.45)]">
              Top Risk Drivers
            </h2>
            <Card className="!p-0 overflow-hidden hover:!translate-y-0">
              <ul className="divide-y divide-white/[0.06]">
                {(data?.topTriggers?.length
                  ? data.topTriggers
                  : []
                ).map((item, i) => (
                  <li
                    key={`${item.trigger}-${i}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-[#120D06]">{item.trigger}</span>
                    <span className="text-sm text-[rgba(18,13,6,0.45)]">{item.count}</span>
                  </li>
                ))}
                {data != null && data.topTriggers.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-[rgba(18,13,6,0.45)]">
                    No triggers recorded
                  </li>
                )}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
