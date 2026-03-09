-- Add raw_text column to policies (stores original policy text)
alter table public.policies add column if not exists raw_text text;
