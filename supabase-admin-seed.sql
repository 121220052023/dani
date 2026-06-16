insert into public.profiles (id, email, full_name, role, is_blocked, preferred_language)
select
  id,
  email,
  'System Admin',
  'admin',
  false,
  'en'
from auth.users
where email = 'admin@email.com'
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_blocked = excluded.is_blocked,
  preferred_language = excluded.preferred_language;
