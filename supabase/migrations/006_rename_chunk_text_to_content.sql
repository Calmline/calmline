-- Rename chunk_text to content in policy_chunks (if column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'policy_chunks' and column_name = 'chunk_text'
  ) then
    alter table public.policy_chunks rename column chunk_text to content;
  end if;
end $$;

-- Update match_policy_chunks RPC to use content
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
