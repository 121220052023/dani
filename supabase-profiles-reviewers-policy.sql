drop policy if exists "profiles reviewers read" on public.profiles;
create policy "profiles reviewers read"
  on public.profiles
  for select
  using (
    auth.role() = 'authenticated'
  );