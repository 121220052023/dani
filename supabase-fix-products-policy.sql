-- Fix: Allow all staff roles to manage products (insert/update/delete)
drop policy if exists "staff manage products" on public.products;
create policy "staff manage products"
  on public.products
  for all
  using (public.current_role() in ('admin', 'marketing', 'sales'))
  with check (public.current_role() in ('admin', 'marketing', 'sales'));