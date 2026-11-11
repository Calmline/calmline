# Zendesk Talk / Voice access

Checked against Zendesk’s public documentation on 9 November 2026.

## What this app does

The Support ticket sidebar does **not** receive live call audio, and it does not receive the live transcript lines Zendesk may show in the agent workspace. Demo mode plays synthetic transcript text through the same Boundary Shield ladder used by the rest of Calmline.

## What Zendesk documents

- **Live transcripts in the agent workspace.** Zendesk Help, “Using live call transcripts in Zendesk Talk” and the 29 July 2026 announcement “view live Voice call transcripts in the Zendesk Agent Workspace,” describe a transcript panel inside Zendesk’s own call controls. It is available for Zendesk Voice with Copilot when live transcription is enabled. Those pages describe the agent’s screen. They do not describe an Apps Framework event, webhook, or audio stream a sidebar app can subscribe to.
- **Sidebar conversation data.** The Apps Framework `ticket.conversation` API includes a `voice` channel. Zendesk’s ticket sidebar reference says voice message content is `null`. The call or voicemail recording is an attachment. That is a recording comment, not live audio and not a live transcript feed.
- **Transcription resource.** The Voice API reference describes a transcription object with ordered `segments` and an optional `summary`. The page does not document a ticket-sidebar subscription that delivers those segments while a call is still in progress.
- **Talk Partner Edition.** A telephony partner can store a transcript string on a call object and add a voice comment. That path is for a phone partner that already has the words and is writing them into Zendesk. It does not give this sidebar app Zendesk’s call audio.
- **Zendesk’s own suggestions.** The call transcription FAQ says real-time transcription powers Zendesk’s real-time suggestions. It also says Zendesk’s transcription feature is for Zendesk Voice, not Talk Partner Edition.

## Decision

Until Zendesk publishes a supported app API for live Voice segments, Calmline must not treat sidebar events, recording attachments, or ticket comments as live call audio. The `zendesk-talk` channel stays `not_connected`.

## Later chat integration

`ticket.conversation` already has text channels such as `chat`, `native_messaging`, and `chat_transcript`. The channel map recognizes them and refuses them. A future chat integration can enable that channel without changing the warning ladder.
