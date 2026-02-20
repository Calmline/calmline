# Calmline

Full-stack AI SaaS for live transcript de-escalation analysis. Accepts transcript input, sends it to the OpenAI API, and returns escalation risk, complaint risk, de-escalation suggestions, and tone guidance. Results are stored in Supabase.

## Features

- **Live transcript input** — Paste or type conversation transcripts
- **OpenAI analysis** — Escalation Risk (0–100%), Complaint Risk (Low/Medium/High), 1–2 sentence de-escalation response, tone guidance
- **Supabase storage** — All transcripts and results persisted
- **Next.js + Tailwind** — Modern React frontend with Tailwind styling
- **Twilio-ready** — Placeholder webhook and DB fields for future live Twilio integration

## Setup

1. **Clone and install**

   ```bash
   cd calmline
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set:

   - `OPENAI_API_KEY` — Your OpenAI API key
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for server-side inserts)

3. **Supabase database**

   Run the migrations in the Supabase SQL Editor (or via CLI), in order:

   - `supabase/migrations/001_create_transcripts.sql`
   - `supabase/migrations/002_create_call_events.sql`
   - `supabase/migrations/003_create_call_outcomes.sql`

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## API

- **POST /api/analyze** — Body: `{ "transcript": "..." }`. Optional: `callId`, `speaker`, `twilio_call_sid`, `twilio_contact_id`. Returns analysis; stores in `transcripts` and (when `callId` present) in `call_events`.
- **GET /api/transcripts** — Returns recent transcript records.
- **POST /api/calls/[callId]/outcome** — Body: `{ "supervisor_requested": true|false, "source": "manual"|"crm"|"integration"|"twilio" }`. Records call outcome for fine-tuning (upsert by `callId`).
- **GET /api/calls/[callId]/outcome** — Returns the recorded outcome for a call, if any.
- **GET /api/training-data** — Query: `?since=<ISO>&limit=N&only_with_outcome=true`. Returns training-ready rows (segments + escalation labels + outcome) for future model fine-tuning.
- **POST /api/twilio/webhook** — Placeholder for future Twilio live transcript webhooks (returns 501).

## Fine-tuning data (backend only)

The app captures data for future model fine-tuning; no dashboard is built for it.

- **Transcript segments** — Stored in `call_events` (and full analyses in `transcripts`).
- **Escalation labels** — Per-segment in `call_events`: `escalation_level`, `rolling_escalation_risk`, `rolling_complaint_risk`, `detected_triggers`, etc.
- **Outcome** — Stored in `call_outcomes`: one row per call with `supervisor_requested` (boolean). Record via **POST /api/calls/[callId]/outcome** when the call ends (e.g. from your CRM or UI).
- **Training export** — **GET /api/training-data** or `getTrainingExamples()` in `src/lib/trainingData.ts` returns joined segments + labels + outcome for export to a training pipeline.

## Twilio Voice integration (MVP)

Real phone calls can stream live audio into Calmline for real-time coaching.

1. **Voice webhook** — **POST /api/twilio/voice** returns TwiML that starts a Media Stream to your WebSocket server (`wss://your-domain/ws/audio`). Configure this URL in Twilio: Phone Numbers → your number → Voice & Fax → A CALL COMES IN → Webhook.

2. **WebSocket server** — Run alongside the app (e.g. `npm run ws-server`, default port 3001). It:
   - Accepts Twilio at **/ws/audio** (receives base64 μ-law 8kHz audio).
   - Accepts the Live Session UI at **/ws/session** (receives transcript events).
   - Buffers audio, runs speech-to-text (MVP: mock; production: Google Speech or chunked Whisper), and broadcasts transcript to session clients.
   - MVP: does not store raw audio; only transcript is logged/used.

3. **Environment** — Set `NEXT_PUBLIC_WS_URL` (and optionally `TWILIO_WS_BASE_URL`) to your WebSocket base (e.g. `wss://your-domain.com` or `ws://localhost:3001` for local). The frontend connects to `{NEXT_PUBLIC_WS_URL}/ws/session` when you start a Live Session.

4. **Flow** — Call your Twilio number → Twilio hits /api/twilio/voice → TwiML starts stream to /ws/audio → You open Live Session in the app and click Start Live Session → Browser connects to /ws/session → Audio is buffered and sent to STT → Transcript is pushed to the UI and the existing live analysis pipeline runs.

5. **Edge cases** — Reconnect with backoff if the session WebSocket drops; Retry button when connection fails; graceful disconnect when you stop the session.

## Twilio (general)

The app is prepared for Twilio:

- `transcripts` table has `twilio_call_sid` and `twilio_contact_id`.
- `/api/analyze` accepts optional `twilio_call_sid` and `twilio_contact_id`.
- `/api/twilio/webhook` is a stub for other webhook use cases.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes, OpenAI API, Supabase (PostgreSQL)
- **Future:** Twilio (webhook route ready)
