-- Replaces a sealed refresh token only when it is still the token that was used.
-- A slower refresh cannot overwrite tokens stored by a newer refresh.
-- The function returns whether this caller won. It does not return token values.

create or replace function public.boundary_shield_rotate_oauth(
  account_id text,
  expected_sealed_refresh_token text,
  sealed_access_token text,
  sealed_refresh_token text,
  token_expires_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if account_id is null
     or account_id !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
     or expected_sealed_refresh_token is null
     or length(expected_sealed_refresh_token) < 40
     or expected_sealed_refresh_token ~ '[[:space:]]'
     or sealed_access_token is null
     or length(sealed_access_token) < 40
     or sealed_access_token ~ '[[:space:]]'
     or sealed_refresh_token is null
     or length(sealed_refresh_token) < 40
     or sealed_refresh_token ~ '[[:space:]]' then
    raise exception 'sealed oauth token was refused';
  end if;

  update public.boundary_installations
  set sealed_access_token = boundary_shield_rotate_oauth.sealed_access_token,
      sealed_refresh_token = boundary_shield_rotate_oauth.sealed_refresh_token,
      token_expires_at = boundary_shield_rotate_oauth.token_expires_at
  where subdomain = account_id
    and sealed_refresh_token = expected_sealed_refresh_token;
  return found;
end;
$$;

revoke all on function public.boundary_shield_rotate_oauth(text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.boundary_shield_rotate_oauth(text, text, text, text, timestamptz) to service_role;
