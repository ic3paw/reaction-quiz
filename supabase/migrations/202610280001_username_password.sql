begin;

-- Usernames are identifiers, not credentials. Passwords remain in Supabase Auth.
create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
revoke all on public.account_profiles from public, anon, authenticated;
grant select on public.account_profiles to authenticated;
create policy "Read own username" on public.account_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

-- Claiming is atomic and one-time. Neither metadata edits nor direct table writes
-- can take over a username. Existing Auth IDs and study backups are unchanged.
create function public.claim_username(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  normalized text := lower(btrim(p_username));
  current_name text;
begin
  if auth.uid() is null then raise exception 'Sign in before choosing a username'; end if;
  if normalized is null or normalized !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Use 3–24 letters, numbers, or underscores';
  end if;
  insert into public.account_profiles (user_id, username)
    values (auth.uid(), normalized) on conflict (user_id) do nothing;
  select username into current_name from public.account_profiles where user_id = auth.uid();
  if current_name <> normalized then raise exception 'This account already has a username'; end if;
  return current_name;
exception when unique_violation then
  raise exception 'That username is unavailable';
end;
$$;
revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;

-- Reserve the requested username in the same transaction as an Auth signup.
-- Older email-link users may omit username and claim one after signing in.
create function public.create_account_username()
returns trigger language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  if normalized is not null then
    if normalized !~ '^[a-z0-9_]{3,24}$' then raise exception 'Invalid username'; end if;
    insert into public.account_profiles (user_id, username) values (new.id, normalized);
  end if;
  return new;
end;
$$;
revoke all on function public.create_account_username() from public, anon, authenticated;
create trigger on_auth_user_created_username after insert on auth.users
  for each row execute function public.create_account_username();

-- Private, persistent counters work across Edge Function instances. Fixed
-- 15-minute windows: 10 attempts per username and 1,000 total endpoint attempts.
-- The global cap bounds both work and counter growth from random usernames.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.username_login_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
create index username_login_limits_expiry on private.username_login_limits(window_start);
revoke all on private.username_login_limits from public, anon, authenticated;

create function public.resolve_username_for_login(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized text := lower(btrim(p_username));
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / 900) * 900);
  count_attempts integer;
  login_email text;
  limit_key text;
begin
  if normalized is null or normalized !~ '^[a-z0-9_]{3,24}$' then
    return jsonb_build_object('allowed', false);
  end if;
  delete from private.username_login_limits where window_start < now() - interval '1 day';
  insert into private.username_login_limits as limits (key, window_start, attempts)
    values ('global', bucket, 1)
    on conflict (key) do update set
      window_start = excluded.window_start,
      attempts = case when limits.window_start = excluded.window_start
        then least(limits.attempts + 1, 1001) else 1 end
    returning attempts into count_attempts;
  if count_attempts > 1000 then return jsonb_build_object('allowed', false); end if;
  limit_key := encode(sha256(convert_to(normalized, 'UTF8')), 'hex');
  insert into private.username_login_limits as limits (key, window_start, attempts)
    values (limit_key, bucket, 1)
    on conflict (key) do update set
      window_start = excluded.window_start,
      attempts = case when limits.window_start = excluded.window_start
        then least(limits.attempts + 1, 11) else 1 end
    returning attempts into count_attempts;
  if count_attempts > 10 then return jsonb_build_object('allowed', false); end if;
  select u.email into login_email from public.account_profiles p
    join auth.users u on u.id = p.user_id
    where p.username = normalized and u.email_confirmed_at is not null;
  return jsonb_build_object('allowed', true, 'email', login_email);
end;
$$;
-- This RPC exposes an email to the server only. Never grant it to app users.
revoke all on function public.resolve_username_for_login(text) from public, anon, authenticated;
grant execute on function public.resolve_username_for_login(text) to service_role;

commit;
