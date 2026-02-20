"use client";

import { useState, useEffect } from "react";

type TranscriptItem = {
  id: string;
  transcript_text: string;
  escalation_risk: number;
  complaint_risk: string;
  deescalation_response: string | null;
  tone_guidance: string | null;
  created_at: string;
};

export function HistoryList() {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transcripts")
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data?.transcripts) ? data.transcripts : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-base text-muted">Loading recent analyses…</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-base text-muted">
        No analyses yet. Submit a transcript above to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-accent bg-white px-5 py-4 shadow-soft"
        >
          <p className="line-clamp-2 text-base text-heading">
            {item.transcript_text || "(empty)"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Escalation: {item.escalation_risk}%</span>
            <span>·</span>
            <span>Complaint: {item.complaint_risk}</span>
            <span>·</span>
            <time dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleString()}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
