import type { BoundaryShieldSessionStore } from "./engine";
import type { IngestResult, TranscriptSegment } from "./types";
import { ingestZendeskSidebarEvent, type ZendeskSidebarTranscriptEvent } from "./zendeskAdapter";

/**
 * Channels the sidebar can grow into.
 * Demo and explicit sidebar text can be ingested.
 * Chat is recognized and reserved.
 * Talk audio and live Voice transcripts are not ingested.
 */
export type TranscriptChannelId = "demo" | "zendesk-ticket-sidebar" | "zendesk-chat" | "zendesk-talk";

export type TranscriptChannel = {
  id: TranscriptChannelId;
  status: "ready" | "text-only" | "not_connected";
  liveAudio: false;
  acceptsEvents: boolean;
  summary: string;
};

export const TRANSCRIPT_CHANNELS: Record<TranscriptChannelId, TranscriptChannel> = {
  demo: {
    id: "demo",
    status: "ready",
    liveAudio: false,
    acceptsEvents: true,
    summary: "Local synthetic call events. No Zendesk account and no audio.",
  },
  "zendesk-ticket-sidebar": {
    id: "zendesk-ticket-sidebar",
    status: "text-only",
    liveAudio: false,
    acceptsEvents: true,
    summary: "Accepts text events the sidebar app already has. Live call audio is not connected.",
  },
  "zendesk-chat": {
    id: "zendesk-chat",
    status: "not_connected",
    liveAudio: false,
    acceptsEvents: false,
    summary: "Zendesk chat and messaging are reserved for a later integration. They are not connected.",
  },
  "zendesk-talk": {
    id: "zendesk-talk",
    status: "not_connected",
    liveAudio: false,
    acceptsEvents: false,
    summary:
      "Live call audio is not connected. Zendesk can show Voice transcripts in its own agent workspace, but the Apps Framework does not stream that audio or those live lines to a sidebar app.",
  },
};

export type ChannelIngestResult =
  | { accepted: true; ingest: IngestResult }
  | { accepted: false; reason: string };

export function ingestForChannel(
  store: BoundaryShieldSessionStore,
  channelId: TranscriptChannelId,
  input: {
    segment?: TranscriptSegment;
    sidebarEvent?: ZendeskSidebarTranscriptEvent;
  },
): ChannelIngestResult {
  const channel = TRANSCRIPT_CHANNELS[channelId];
  if (!channel.acceptsEvents) {
    return { accepted: false, reason: channel.summary };
  }
  if (channelId === "demo") {
    if (!input.segment) return { accepted: false, reason: "Demo events require a transcript segment" };
    return { accepted: true, ingest: store.ingest(input.segment) };
  }
  if (!input.sidebarEvent) {
    return { accepted: false, reason: "Sidebar events require ticket-sidebar text" };
  }
  return ingestZendeskSidebarEvent(store, input.sidebarEvent);
}

/**
 * ticket.conversation entries are not a live audio feed.
 * Voice rows are recording comments. Chat rows are reserved until chat support is built.
 */
export function classifySupportConversationEntry(entry: {
  channelName?: string;
  content?: string | null;
}): { usableAsLiveTranscript: false; reason: string } {
  if (entry.channelName === "voice") {
    return {
      usableAsLiveTranscript: false,
      reason:
        "A Zendesk voice conversation entry is a call or voicemail recording comment. Its message content is empty. It is not live audio or a live transcript.",
    };
  }
  if (
    entry.channelName === "chat" ||
    entry.channelName === "native_messaging" ||
    entry.channelName === "chat_transcript"
  ) {
    return {
      usableAsLiveTranscript: false,
      reason: TRANSCRIPT_CHANNELS["zendesk-chat"].summary,
    };
  }
  return {
    usableAsLiveTranscript: false,
    reason: "Only explicit demo segments and ticket-sidebar text events can raise a Boundary Shield warning.",
  };
}
