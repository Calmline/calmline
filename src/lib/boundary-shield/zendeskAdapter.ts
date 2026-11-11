import type { BoundaryShieldSessionStore } from "./engine";
import type { IngestResult, SpeakerRole, TranscriptSegment } from "./types";

/**
 * Future Zendesk Support ticket-sidebar boundary.
 *
 * Live Zendesk Talk audio, call recordings, and media streams are not connected.
 * Do not describe this prototype as having access to them.
 * A later sidebar app may pass text events only after a supported integration is verified.
 */
export const ZENDESK_VOICE_INTEGRATION = {
  surface: "zendesk-support-ticket-sidebar",
  talkAudio: "not_connected",
  limitation:
    "No supported Zendesk Talk audio path is wired. This adapter accepts ticket-sidebar text events only.",
} as const;

export type ZendeskSidebarTranscriptEvent = {
  ticketId: string;
  eventId: string;
  authorRole: string;
  text: string;
  createdAt: string;
  source: "ticket-sidebar-text";
};

export type AdapterResult =
  | { accepted: true; ingest: IngestResult }
  | { accepted: false; reason: string };

const ROLE_MAP: Record<string, SpeakerRole> = {
  "end-user": "customer",
  customer: "customer",
  caller: "customer",
  agent: "agent",
  admin: "agent",
  system: "system",
};

export function mapZendeskAuthorRole(authorRole: string): SpeakerRole | null {
  return ROLE_MAP[authorRole.trim().toLowerCase()] ?? null;
}

export function toTranscriptSegment(event: ZendeskSidebarTranscriptEvent): TranscriptSegment {
  const speaker = mapZendeskAuthorRole(event.authorRole);
  if (!speaker) {
    throw new Error(`Unsupported Zendesk author role: ${event.authorRole}`);
  }
  return {
    segmentId: event.eventId,
    conversationId: event.ticketId,
    speaker,
    text: event.text,
    timestamp: event.createdAt,
  };
}

export function ingestZendeskSidebarEvent(
  store: BoundaryShieldSessionStore,
  event: ZendeskSidebarTranscriptEvent,
): AdapterResult {
  if (event.source !== "ticket-sidebar-text") {
    return {
      accepted: false,
      reason: ZENDESK_VOICE_INTEGRATION.limitation,
    };
  }
  if (!event.ticketId?.trim() || !event.eventId?.trim()) {
    return { accepted: false, reason: "Ticket id and event id are required" };
  }
  if (!mapZendeskAuthorRole(event.authorRole)) {
    return { accepted: false, reason: `Unsupported Zendesk author role: ${event.authorRole}` };
  }
  return { accepted: true, ingest: store.ingest(toTranscriptSegment(event)) };
}
