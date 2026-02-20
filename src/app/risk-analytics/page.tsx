"use client";

import { useState, useEffect } from "react";

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
        const res = await fetch("/api/risk-analytics");
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
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-heading mb-6">
        Risk Analytics
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted">
          Loading analytics…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-muted">
          No analytics data yet. Data will appear as calls are processed.
        </div>
      )}

      {!loading && !error && (data === null || data.totalCalls > 0) && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <section>
            <h2 className="text-sm font-medium text-muted mb-3">
              KPI Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-muted">Total Calls</p>
                <p className="text-xl font-semibold text-heading mt-1">
                  {data?.totalCalls ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-muted">Escalation Rate</p>
                <p className="text-xl font-semibold text-heading mt-1">
                  {data != null ? `${data.escalationRate}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-muted">Avg Escalation Risk</p>
                <p className="text-xl font-semibold text-heading mt-1">
                  {data != null ? data.avgEscalationRisk.toFixed(1) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-muted">Avg Complaint Risk</p>
                <p className="text-xl font-semibold text-heading mt-1">
                  {data != null ? data.avgComplaintRisk.toFixed(1) : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Escalation Trend Chart (placeholder) */}
          <section>
            <h2 className="text-sm font-medium text-muted mb-3">
              Escalation Trend
            </h2>
            <div
              className="rounded-lg border border-gray-200 bg-gray-50 h-64 flex items-center justify-center text-muted"
              aria-hidden
            >
              Chart placeholder
            </div>
          </section>

          {/* Escalation Distribution (placeholder) */}
          <section>
            <h2 className="text-sm font-medium text-muted mb-3">
              Escalation Distribution
            </h2>
            <div
              className="rounded-lg border border-gray-200 bg-gray-50 h-48 flex items-center justify-center text-muted"
              aria-hidden
            >
              Distribution placeholder
            </div>
          </section>

          {/* Top Risk Drivers list */}
          <section>
            <h2 className="text-sm font-medium text-muted mb-3">
              Top Risk Drivers
            </h2>
            <ul className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-200">
              {(data?.topTriggers?.length
                ? data.topTriggers
                : []
              ).map((item, i) => (
                <li
                  key={`${item.trigger}-${i}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-heading">{item.trigger}</span>
                  <span className="text-muted text-sm">{item.count}</span>
                </li>
              ))}
              {data != null && data.topTriggers.length === 0 && (
                <li className="px-4 py-6 text-center text-muted text-sm">
                  No triggers recorded
                </li>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
