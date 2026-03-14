-- Add columns to call_sessions so call-history and the app can store/read full session data.
-- Run only if call_sessions already exists (e.g. created in Supabase dashboard or elsewhere).
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS ai_response text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS caller_number text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS call_outcome text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS disposition_reason text;
