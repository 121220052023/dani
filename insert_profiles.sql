insert into public.profiles (id, email, full_name, role, preferred_language) values
('195c0592-bfb3-4b12-a9c9-8807e5cd0e4b', 'admin_test_123@example.com', null, 'admin', 'en'),
('2fd59a00-f8fa-4376-8b65-903175c8f895', 'admin@email.com', null, 'admin', 'en'),
('ccd2538b-fb10-4577-8f78-61be1789254', 'danimaz534@gmail.com', 'Dani', 'admin', 'en'),
('02082d0b-d352-4637-ad37-3b199d3f8355', 'marketing@email.com', null, 'marketing', 'en'),
('f7ade1f6-4af8-4ed5-b3ec-ec1bd6da6122', 'mnawerenta@gmail.com', 'Mhmd', 'admin', 'en'),
('d47b4986-4150-4686-8a9b-8a9239f88d60', 'sales@email.com', null, 'sales', 'en')
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  role = excluded.role,
  preferred_language = excluded.preferred_language;