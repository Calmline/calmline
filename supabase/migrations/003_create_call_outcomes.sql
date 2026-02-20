-- Calmline: call outcomes for fine-tuning (supervisor requested or not)
-- One row per call; join with call_events to get segments + labels + outcome.

create table if not exists public.call_outcomes (
  id uuid primary key default gen_random_uuid(),
  call_id text not null unique,
  supervisor_requested boolean not null,
  recorded_at timestamptz not null default now(),
  source text check (source is null or source in ('manual', 'crm', 'integration', 'twilio'))
);

create index if not exists idx_call_outcomes_call_id on public.call_outcomes (call_id);
create index if not exists idx_call_outcomes_recorded_at on public.call_outcomes (recorded_at desc);

alter table public.call_outcomes enable row level security;

create policy "Allow service role full access"
  on public.call_outcomes
  for all
  using (true)
  with check (true);
