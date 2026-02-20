-- Calmline: structured call event logging for live sessions
-- Enables reconstruction of full escalation trajectories per call.

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  "timestamp" timestamptz not null default now(),
  speaker text check (speaker is null or speaker in ('agent', 'customer')),
  transcript_segment text not null,
  rolling_escalation_risk integer not null check (rolling_escalation_risk >= 0 and rolling_escalation_risk <= 100),
  rolling_complaint_risk integer not null check (rolling_complaint_risk >= 0 and rolling_complaint_risk <= 100),
  detected_triggers text[] not null default '{}',
  suggested_script text,
  tactical_guidance text,
  response_latency_ms integer,
  escalation_level text not null check (escalation_level in ('Low', 'Moderate', 'High', 'Critical')),
  urgency_level text not null check (urgency_level in ('low', 'medium', 'high', 'critical'))
);

-- Index for reconstructing trajectory by call
create index if not exists idx_call_events_call_id_timestamp
  on public.call_events (call_id, "timestamp" asc);

-- Optional: list recent calls
create index if not exists idx_call_events_timestamp
  on public.call_events ("timestamp" desc);

alter table public.call_events enable row level security;

create policy "Allow service role full access"
  on public.call_events
  for all
  using (true)
  with check (true);
