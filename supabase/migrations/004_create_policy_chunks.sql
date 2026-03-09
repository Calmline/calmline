-- Policy documents and chunks for RAG
-- Run in Supabase SQL Editor. Enable pgvector in Dashboard > Database > Extensions if needed.
-- If you previously ran an older 004 that created policy_chunks with document_id, run first:
--   drop table if exists policy_chunks; drop table if exists policies;
create extension if not exists vector;

-- Parent: one row per uploaded policy document
create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  status text not null default 'embedded' check (status in ('embedded', 'processing', 'error')),
  chunk_count integer not null default 0
);

alter table public.policies enable row level security;
create policy "Allow service role full access policies"
  on public.policies for all using (true) with check (true);

create index if not exists idx_policies_created_at on public.policies (created_at desc);

-- Child: chunks with embeddings (FK to policies)
create table if not exists public.policy_chunks (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.policy_chunks enable row level security;
create policy "Allow service role full access policy_chunks"
  on public.policy_chunks for all using (true) with check (true);

create index if not exists idx_policy_chunks_policy_id on public.policy_chunks (policy_id);
create index if not exists idx_policy_chunks_embedding on public.policy_chunks using hnsw (embedding vector_cosine_ops);

-- RPC for vector similarity search
create or replace function match_policy_chunks(
  query_embedding vector(1536),
  match_threshold float default 0,
  match_count int default 5
)
returns table (content text, metadata jsonb)
language sql stable
as $$
  select pc.content, pc.metadata
  from public.policy_chunks pc
  where 1 - (pc.embedding <=> query_embedding) > match_threshold
  order by pc.embedding <=> query_embedding
  limit match_count;
$$;
