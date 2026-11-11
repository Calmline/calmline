-- Boundary Shield staging storage.
-- Tenant rows are isolated by subdomain. Customer message text is not a column.
-- Browser roles have no grants. service_role can read two tables and execute two functions.
-- Ticket writes are not represented here: decision.executed cannot be stored as true.

create table if not exists public.boundary_installations (
  subdomain text primary key,
  review_group_id text not null,
  normal_group_id text not null,
  sealed_webhook_secret text,
  sealed_access_token text,
  sealed_refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint boundary_installations_subdomain_check
    check (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

create table if not exists public.boundary_decisions (
  account_id text not null,
  ticket_id text not null,
  comment_id text not null,
  created_at timestamptz not null,
  state text not null check (state in ('pending', 'clear', 'protected')),
  effect text not null check (effect in ('hold-pending', 'release-to-normal-queue', 'hold-for-review')),
  severity text not null,
  reason text not null,
  blocks_release boolean not null,
  executed boolean not null default false check (executed = false),
  recovery_noted_at timestamptz,
  primary key (account_id, ticket_id, comment_id)
);

create table if not exists public.boundary_deliveries (
  account_id text not null,
  delivery_id text not null,
  comment_id text not null,
  received_at timestamptz not null default now(),
  primary key (account_id, delivery_id)
);

create table if not exists public.boundary_audit (
  id bigint generated always as identity primary key,
  account_id text not null,
  ticket_id text not null,
  comment_id text not null,
  recorded_at timestamptz not null,
  event_type text not null,
  state text not null,
  severity text not null,
  effect text not null,
  reason text not null,
  executed boolean not null default false check (executed = false)
);

create index if not exists boundary_decisions_stuck
  on public.boundary_decisions (account_id, created_at)
  where state = 'pending' and blocks_release = true;

alter table public.boundary_installations enable row level security;
alter table public.boundary_decisions enable row level security;
alter table public.boundary_deliveries enable row level security;
alter table public.boundary_audit enable row level security;

-- Postgres grants nothing on new tables to PUBLIC. Supabase also grants new
-- tables to anon and authenticated, so those grants are removed explicitly.
revoke all on table public.boundary_installations from public, anon, authenticated;
revoke all on table public.boundary_decisions from public, anon, authenticated;
revoke all on table public.boundary_deliveries from public, anon, authenticated;
revoke all on table public.boundary_audit from public, anon, authenticated;

-- The server may read installations and past decisions. It cannot write rows
-- directly. Writes go through the functions below, which run as the owner.
revoke all on table public.boundary_installations from service_role;
revoke all on table public.boundary_decisions from service_role;
revoke all on table public.boundary_deliveries from service_role;
revoke all on table public.boundary_audit from service_role;
grant select on table public.boundary_installations to service_role;
grant select on table public.boundary_decisions to service_role;

revoke all on sequence public.boundary_audit_id_seq from public, anon, authenticated, service_role;

create or replace function public.boundary_shield_commit(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_delivery integer;
  inserted_decision integer;
  existing public.boundary_decisions%rowtype;
  tenant text;
begin
  if payload ? 'text' or payload ? 'body' or payload ? 'plain_body' or payload ? 'html_body' or payload ? 'email' then
    raise exception 'message text is not stored';
  end if;

  tenant := payload->>'account_id';
  if tenant !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
     or coalesce(payload->>'ticket_id', '') = ''
     or coalesce(payload->>'comment_id', '') = ''
     or coalesce(payload->>'delivery_id', '') = '' then
    raise exception 'tenant and ticket identifiers are required';
  end if;

  insert into public.boundary_deliveries (account_id, delivery_id, comment_id)
  values (tenant, payload->>'delivery_id', payload->>'comment_id')
  on conflict (account_id, delivery_id) do nothing;
  get diagnostics inserted_delivery = row_count;

  if inserted_delivery = 0 then
    select * into existing
    from public.boundary_decisions
    where account_id = tenant
      and ticket_id = payload->>'ticket_id'
      and comment_id = payload->>'comment_id';
    if existing.account_id is null then
      raise exception 'stored decision is missing';
    end if;
    return pg_catalog.jsonb_build_object(
      'duplicate', true,
      'state', existing.state,
      'effect', existing.effect,
      'executed', false
    );
  end if;

  insert into public.boundary_decisions (
    account_id, ticket_id, comment_id, created_at, state, effect, severity, reason, blocks_release, executed
  ) values (
    tenant,
    payload->>'ticket_id',
    payload->>'comment_id',
    (payload->>'created_at')::timestamptz,
    payload->>'state',
    payload->>'effect',
    payload->>'severity',
    payload->>'reason',
    (payload->>'blocks_release')::boolean,
    false
  )
  on conflict (account_id, ticket_id, comment_id) do nothing;
  get diagnostics inserted_decision = row_count;

  if inserted_decision = 0 then
    select * into existing
    from public.boundary_decisions
    where account_id = tenant
      and ticket_id = payload->>'ticket_id'
      and comment_id = payload->>'comment_id';
    if existing.account_id is null then
      raise exception 'stored decision is missing';
    end if;
    return pg_catalog.jsonb_build_object(
      'duplicate', true,
      'state', existing.state,
      'effect', existing.effect,
      'executed', false
    );
  end if;

  insert into public.boundary_audit (
    account_id, ticket_id, comment_id, recorded_at, event_type, state, severity, effect, reason, executed
  ) values (
    tenant,
    payload->>'ticket_id',
    payload->>'comment_id',
    (payload->>'recorded_at')::timestamptz,
    payload->>'event_type',
    payload->>'state',
    payload->>'severity',
    payload->>'effect',
    payload->>'reason',
    false
  );

  return pg_catalog.jsonb_build_object(
    'duplicate', false,
    'state', payload->>'state',
    'effect', payload->>'effect',
    'executed', false
  );
end;
$$;

create or replace function public.boundary_shield_note_stuck(max_age interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  noted integer;
begin
  if max_age is null or max_age <= interval '0 seconds' then
    raise exception 'a positive recovery age is required';
  end if;

  -- This marks every stuck tenant. It does not take a tenant argument, and it
  -- does not change a decision from pending to clear.
  update public.boundary_decisions
  set recovery_noted_at = pg_catalog.now()
  where state = 'pending'
    and blocks_release = true
    and recovery_noted_at is null
    and created_at < pg_catalog.now() - max_age;
  get diagnostics noted = row_count;
  return noted;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default. Supabase also grants new
-- functions to anon and authenticated. Remove those, then allow only service_role.
revoke all on function public.boundary_shield_commit(jsonb) from public, anon, authenticated;
revoke all on function public.boundary_shield_note_stuck(interval) from public, anon, authenticated;
grant execute on function public.boundary_shield_commit(jsonb) to service_role;
grant execute on function public.boundary_shield_note_stuck(interval) to service_role;
