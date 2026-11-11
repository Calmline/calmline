-- Stores a sealed Zendesk OAuth token on an existing installation.
-- The function does not return the token. Ticket decisions stay unexecuted.

create or replace function public.boundary_shield_store_oauth(
  account_id text,
  sealed_access_token text,
  sealed_refresh_token text,
  token_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if account_id is null
     or account_id !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
     or sealed_access_token is null
     or length(sealed_access_token) < 40
     or sealed_access_token ~ '[[:space:]]'
     or sealed_refresh_token ~ '[[:space:]]' then
    raise exception 'sealed oauth token was refused';
  end if;

  update public.boundary_installations
  set sealed_access_token = boundary_shield_store_oauth.sealed_access_token,
      sealed_refresh_token = boundary_shield_store_oauth.sealed_refresh_token,
      token_expires_at = boundary_shield_store_oauth.token_expires_at
  where subdomain = account_id;
  if not found then
    raise exception 'installation is missing';
  end if;
end;
$$;

revoke all on function public.boundary_shield_store_oauth(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.boundary_shield_store_oauth(text, text, text, timestamptz) to service_role;
