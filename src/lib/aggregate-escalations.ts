/**
 * Secondary service: aggregates call_events, identifies escalation triggers,
 * clusters phrases by category, and outputs structured JSON for the
 * proprietary escalation dataset.
 */

import type { CallEventRow } from "./supabase";
import type {
  EscalationCategory,
  EscalationDatasetSummary,
  CategoryPattern,
  PhraseCluster,
} from "./escalation-types";
import { classifyTrigger, getCategoryLabel } from "./escalation-triggers";

const CATEGORIES: EscalationCategory[] = [
  "manager_request",
  "legal_threat",
  "refund_demand",
  "repeated_contact_frustration",
  "policy_resistance",
];

function normalizePhrase(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}

/**
 * Cluster similar phrases: same normalized form goes in the same cluster.
 * Canonical form is the most frequent original phrasing for that norm.
 */
function clusterPhrases(
  phraseCounts: Map<string, number>
): { canonical: string; phrases: string[]; count: number }[] {
  const byNorm = new Map<string, { phrases: Set<string>; count: number }>();
  for (const [phrase, count] of phraseCounts) {
    const n = normalizePhrase(phrase);
    if (!n) continue;
    const existing = byNorm.get(n);
    if (existing) {
      existing.phrases.add(phrase);
      existing.count += count;
    } else {
      byNorm.set(n, { phrases: new Set([phrase]), count });
    }
  }
  return Array.from(byNorm.entries()).map(([norm, { phrases, count }]) => {
    const arr = Array.from(phrases);
    const canonical = arr.reduce((best, p) => (p.length <= best.length ? p : best), arr[0] ?? norm);
    return { canonical, phrases: arr, count };
  });
}

/**
 * Aggregate call_events into per-category pattern frequency and phrase clusters.
 */
export function aggregateEscalationPatterns(
  events: CallEventRow[],
  options?: { since?: string; until?: string }
): EscalationDatasetSummary {
  const now = new Date().toISOString();
  const byCategory = new Map<EscalationCategory, Map<string, number>>();
  const eventIdsWithTrigger = new Set<string>();

  for (const cat of CATEGORIES) {
    byCategory.set(cat, new Map());
  }

  for (const event of events) {
    const triggers = event.detected_triggers ?? [];
    for (const phrase of triggers) {
      const trimmed = phrase.trim();
      if (!trimmed) continue;
      const category = classifyTrigger(trimmed);
      if (category) {
        eventIdsWithTrigger.add(event.id);
        const counts = byCategory.get(category)!;
        counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
      }
    }
  }

  const categories: CategoryPattern[] = CATEGORIES.map((category) => {
    const phraseCounts = byCategory.get(category)!;
    const totalOccurrences = Array.from(phraseCounts.values()).reduce((a, b) => a + b, 0);
    const clusters = clusterPhrases(phraseCounts);
    const topPhrases = Array.from(phraseCounts.entries())
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    const eventCount = events.filter((e) =>
      (e.detected_triggers ?? []).some((p) => classifyTrigger(p.trim()) === category)
    ).length;
    return {
      category,
      label: getCategoryLabel(category),
      totalOccurrences,
      eventCount,
      clusters,
      topPhrases,
    };
  });

  const totalTriggers = Array.from(byCategory.values()).reduce(
    (sum, m) => sum + Array.from(m.values()).reduce((a, b) => a + b, 0),
    0
  );

  const categoryFrequency = categories
    .map((c) => ({ category: c.category, label: c.label, count: c.totalOccurrences }))
    .sort((a, b) => b.count - a.count);

  return {
    generatedAt: now,
    window: options?.since || options?.until ? { since: options.since, until: options.until } : undefined,
    totalEvents: events.length,
    totalTriggers,
    categories,
    categoryFrequency,
  };
}

/**
 * Fetch call_events from the database and return the escalation dataset summary.
 * Use from API route or a cron job.
 */
export async function buildEscalationDataset(options?: {
  since?: string;
  limit?: number;
}): Promise<EscalationDatasetSummary> {
  const { getCallEvents } = await import("./supabase");
  const events = await getCallEvents({
    since: options?.since,
    limit: options?.limit ?? 10_000,
  });
  return aggregateEscalationPatterns(events, {
    since: options?.since,
  });
}
