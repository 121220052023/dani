-- Fix 1: Allow all authenticated users to upload product images
drop policy if exists "Anyone can upload product images" on storage.buckets;
drop policy if exists "Anyone can view product images" on storage.buckets;
drop policy if exists "Anyone can update product images" on storage.objects;
drop policy if exists "Anyone can delete product images" on storage.objects;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('product-images', 'product-images', true, null, null) on conflict (id) do nothing;
create policy "Anyone can upload product images" on storage.buckets for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "Anyone can view product images" on storage.buckets for select using (bucket_id = 'product-images');
create policy "Anyone can update product images" on storage.objects for update using (bucket_id = 'product-images');
create policy "Anyone can delete product images" on storage.objects for delete using (bucket_id = 'product-images');

-- Fix 2: Allow all staff roles to insert products
drop policy if exists "staff manage products" on public.products;
create policy "staff manage products"
  on public.products
  for all
  using (public.current_role() in ('admin', 'marketing', 'sales'))
  with check (public.current_role() in ('admin', 'marketing', 'sales'));