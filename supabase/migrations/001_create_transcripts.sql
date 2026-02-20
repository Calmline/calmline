-- Calmline: transcripts and analysis results
-- Run this in Supabase SQL Editor or via Supabase CLI

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  transcript_text text not null,
  escalation_risk integer not null check (escalation_risk >= 0 and escalation_risk <= 100),
  complaint_risk text not null check (complaint_risk in ('Low', 'Medium', 'High')),
  deescalation_response text,
  tone_guidance text,
  -- Optional: for future Twilio live integration
  twilio_call_sid text,
  twilio_contact_id text,
  created_at timestamptz not null default now()
);

-- Enable RLS (optional; use service key for server-side writes)
alter table public.transcripts enable row level security;

-- Allow service role / anon with policy as needed
create policy "Allow service role full access"
  on public.transcripts
  for all
  using (true)
  with check (true);

-- Index for listing by date
create index if not exists idx_transcripts_created_at on public.transcripts (created_at desc);
