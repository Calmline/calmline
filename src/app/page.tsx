"use client";

import { HistoryList } from "@/components/HistoryList";

export default function Home() {
  return (
    <div className="text-left">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
        <section className="text-left">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Overview
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-neutral-600">
            Real-Time Escalation Prevention for Customer Support Teams
          </p>
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-800">
              Recent analyses
            </h2>
            <HistoryList />
          </div>
        </section>
      </div>
    </div>
  );
}
