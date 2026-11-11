import type { SpeakerRole, TranscriptSegment } from "./types";

export type SyntheticCall = {
  id: string;
  title: string;
  description: string;
  /** When set, segments may belong to more than one conversation. */
  segments: TranscriptSegment[];
};

function line(
  conversationId: string,
  segmentId: string,
  speaker: SpeakerRole,
  text: string,
  timestamp: string,
): TranscriptSegment {
  return { conversationId, segmentId, speaker, text, timestamp };
}

/** Synthetic calls only. These are not recordings and do not use external APIs. */
export const SYNTHETIC_CALLS: SyntheticCall[] = [
  {
    id: "normal-complaint",
    title: "Ordinary complaint",
    description: "Billing frustration with no insult aimed at the agent.",
    segments: [
      line("call-normal", "n1", "agent", "Thanks for calling. How can I help?", "2026-01-01T10:00:00Z"),
      line("call-normal", "n2", "customer", "This is the third time I have called about a duplicate charge.", "2026-01-01T10:00:08Z"),
      line("call-normal", "n3", "customer", "This is ridiculous. Your company is useless and I want a refund.", "2026-01-01T10:00:16Z"),
      line("call-normal", "n4", "customer", "I am really angry about this bill and I want a manager.", "2026-01-01T10:00:24Z"),
    ],
  },
  {
    id: "targeted-insult",
    title: "Targeted insult",
    description: "One insult aimed at the agent. Expect a first warning.",
    segments: [
      line("call-insult", "i1", "customer", "I have been on hold for a long time.", "2026-01-01T11:00:00Z"),
      line("call-insult", "i2", "customer", "You're an idiot.", "2026-01-01T11:00:10Z"),
    ],
  },
  {
    id: "repeated-abuse",
    title: "Repeated abuse",
    description: "A second directed insult moves the ladder to the final warning.",
    segments: [
      line("call-repeat", "r1", "customer", "You're an idiot.", "2026-01-01T12:00:00Z"),
      line("call-repeat", "r2", "agent", "I want to help, and I need the conversation to stay respectful.", "2026-01-01T12:00:08Z"),
      line("call-repeat", "r3", "customer", "You're useless.", "2026-01-01T12:00:16Z"),
    ],
  },
  {
    id: "harassment",
    title: "Directed harassment",
    description: "Degrading language aimed at the agent, without a violent threat.",
    segments: [
      line("call-harass", "h1", "customer", "You are disgusting.", "2026-01-01T13:00:00Z"),
    ],
  },
  {
    id: "severe-threat",
    title: "Severe threat",
    description: "A threat skips the warning rungs.",
    segments: [
      line("call-threat", "t1", "customer", "My refund is late and I am unhappy.", "2026-01-01T14:00:00Z"),
      line("call-threat", "t2", "customer", "I know where you live.", "2026-01-01T14:00:12Z"),
    ],
  },
  {
    id: "two-calls",
    title: "Two calls at once",
    description: "An insult on one call must not change the other call.",
    segments: [
      line("call-a", "a1", "customer", "You're an idiot.", "2026-01-01T15:00:00Z"),
      line("call-b", "b1", "customer", "This is ridiculous. Your company is useless and I want a refund.", "2026-01-01T15:00:04Z"),
      line("call-a", "a2", "agent", "I can look up that order.", "2026-01-01T15:00:08Z"),
    ],
  },
];

export function scenarioById(id: string): SyntheticCall | undefined {
  return SYNTHETIC_CALLS.find((call) => call.id === id);
}

/** Prefix ids so a demo replay cannot collide with another ticket or earlier play. */
export function scopeSegments(segments: TranscriptSegment[], scope: string): TranscriptSegment[] {
  return segments.map((segment) => ({
    ...segment,
    conversationId: `${scope}:${segment.conversationId}`,
    segmentId: `${scope}:${segment.segmentId}`,
  }));
}
