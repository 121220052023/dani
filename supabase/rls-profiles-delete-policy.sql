-- Add delete policy for profiles so admins can delete users
drop policy if exists "admin can delete profiles" on public.profiles;
create policy "admin can delete profiles" on public.profiles
  for delete using (public.current_role() = 'admin');