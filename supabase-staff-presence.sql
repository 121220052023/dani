alter table public.profiles
  add column if not exists last_seen_at timestamptz not null default now();

update public.profiles
set last_seen_at = coalesce(last_seen_at, created_at, now())
where last_seen_at is null;

create or replace function public.ensure_profile(
  p_full_name text default null,
  p_role text default 'retail',
  p_language text default 'en'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  insert into public.profiles (id, email, full_name, role, preferred_language, last_seen_at)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce(p_full_name, auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name'),
    coalesce(p_role, 'retail'),
    coalesce(p_language, 'en'),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        preferred_language = coalesce(excluded.preferred_language, public.profiles.preferred_language),
        last_seen_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;
