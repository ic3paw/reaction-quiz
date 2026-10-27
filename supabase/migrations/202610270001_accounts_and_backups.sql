-- Apply once through Supabase migrations or the dashboard SQL editor.
begin;

create table public.study_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null check (
    jsonb_typeof(payload) is not distinct from 'object'
    and jsonb_typeof(payload -> 'saved') is not distinct from 'array'
    and jsonb_typeof(payload -> 'attempts') is not distinct from 'array'
    and jsonb_typeof(payload -> 'sessions') is not distinct from 'array'
    and octet_length(payload::text) <= 2097152
  ),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.study_backups enable row level security;
revoke all on public.study_backups from anon, authenticated;
grant select, insert, update on public.study_backups to authenticated;

create policy "Read own backup" on public.study_backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own backup" on public.study_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own backup" on public.study_backups
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Atomic compare-and-swap: revision 0 means there must not be a backup yet.
-- Empty result means another device wrote a newer revision; the client must reload.
create function public.save_study_backup(p_payload jsonb, p_expected_revision bigint)
returns setof public.study_backups
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid backup revision' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    return query insert into public.study_backups (user_id, payload)
      values (auth.uid(), p_payload)
      on conflict (user_id) do nothing
      returning *;
  else
    return query update public.study_backups
      set payload = p_payload, revision = revision + 1, updated_at = clock_timestamp()
      where user_id = auth.uid() and revision = p_expected_revision
      returning *;
  end if;
end;
$$;

revoke all on function public.save_study_backup(jsonb, bigint) from public, anon;
grant execute on function public.save_study_backup(jsonb, bigint) to authenticated;

commit;
