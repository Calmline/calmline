/**
 * Types for the proprietary escalation dataset and pattern aggregation.
 */

export type EscalationCategory =
  | "manager_request"
  | "legal_threat"
  | "refund_demand"
  | "repeated_contact_frustration"
  | "policy_resistance";

export type PhraseCluster = {
  /** Canonical / representative phrase for this cluster */
  canonical: string;
  /** All observed phrases in this cluster */
  phrases: string[];
  /** Total occurrence count */
  count: number;
};

export type CategoryPattern = {
  category: EscalationCategory;
  label: string;
  totalOccurrences: number;
  eventCount: number;
  clusters: PhraseCluster[];
  /** Top phrases by frequency (for quick summary) */
  topPhrases: { phrase: string; count: number }[];
};

export type EscalationDatasetSummary = {
  generatedAt: string;
  window?: { since?: string; until?: string };
  totalEvents: number;
  totalTriggers: number;
  categories: CategoryPattern[];
  /** Overall escalation trigger frequency (which categories are most common) */
  categoryFrequency: { category: EscalationCategory; label: string; count: number }[];
};
