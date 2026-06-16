create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'retail',
  is_blocked boolean not null default false,
  preferred_language text not null default 'en',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.wholesale_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references public.profiles(id),
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  category text not null check (category in ('Phones', 'Accessories')),
  brand text not null,
  price numeric(10,2) not null,
  discount_percent integer not null default 0,
  stock integer not null default 0,
  tags text[] default '{}',
  image_url text,
  is_best_seller boolean not null default false,
  is_featured boolean not null default false,
  is_hot_deal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method text not null check (payment_method in ('Cash on Delivery', 'Market payment')),
  status text not null default 'Preparing' check (status in ('Preparing', 'Shipped', 'On the way', 'Delivered')),
  tracking_code text unique not null,
  subtotal numeric(10,2) not null default 0,
  wholesale_discount numeric(10,2) not null default 0,
  loyalty_discount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  shipping_address jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  discount_percent integer not null default 0
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_sales_id uuid references public.profiles(id),
  last_sales_reply_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_type text not null check (sender_type in ('user', 'sales', 'ai')),
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

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

create or replace function public.redeem_wholesale_code(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.wholesale_codes;
  v_profile public.profiles;
begin
  perform public.ensure_profile();

  select *
  into v_code
  from public.wholesale_codes
  where code = p_code
    and is_used = false
  limit 1;

  if v_code.id is null then
    raise exception 'Invalid or used wholesale code';
  end if;

  update public.wholesale_codes
    set is_used = true,
        redeemed_by = auth.uid(),
        redeemed_at = now()
  where id = v_code.id;

  update public.profiles
    set role = 'wholesale'
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.generate_wholesale_code()
returns public.wholesale_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.wholesale_codes;
begin
  if public.current_role() not in ('admin', 'sales') then
    raise exception 'Insufficient permissions';
  end if;

  v_code := 'WHOLE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.wholesale_codes (code, created_by)
  values (v_code, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ensure_chat_thread()
returns public.chat_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.chat_threads;
begin
  perform public.ensure_profile();

  insert into public.chat_threads (user_id)
  values (auth.uid())
  on conflict (user_id) do update
    set user_id = excluded.user_id
  returning * into v_thread;

  return v_thread;
end;
$$;

create or replace function public.create_order_from_cart(
  p_payment_method text,
  p_shipping_address jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_order public.orders;
  v_cart record;
  v_subtotal numeric(10,2) := 0;
  v_wholesale_discount numeric(10,2) := 0;
  v_loyalty_discount numeric(10,2) := 0;
  v_order_count integer := 0;
  v_discounted_unit numeric(10,2);
begin
  perform public.ensure_profile();

  select * into v_profile from public.profiles where id = auth.uid();
  select count(*) into v_order_count from public.orders where user_id = auth.uid();

  for v_cart in
    select
      ci.product_id,
      ci.quantity,
      p.price,
      p.discount_percent,
      p.stock
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = auth.uid()
  loop
    if v_cart.stock < v_cart.quantity then
      raise exception 'Insufficient stock for product %', v_cart.product_id;
    end if;

    v_discounted_unit := round((v_cart.price * (1 - (v_cart.discount_percent::numeric / 100.0)))::numeric, 2);
    v_subtotal := v_subtotal + (v_discounted_unit * v_cart.quantity);
  end loop;

  if v_subtotal = 0 then
    raise exception 'Cart is empty';
  end if;

  if v_profile.role = 'wholesale' then
    v_wholesale_discount := round((v_subtotal * 0.15)::numeric, 2);
  end if;

  if v_order_count >= 10 then
    v_loyalty_discount := round(((v_subtotal - v_wholesale_discount) * 0.10)::numeric, 2);
  end if;

  insert into public.orders (
    user_id,
    payment_method,
    status,
    tracking_code,
    subtotal,
    wholesale_discount,
    loyalty_discount,
    total_amount,
    shipping_address
  )
  values (
    auth.uid(),
    p_payment_method,
    'Preparing',
    'TRK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    v_subtotal,
    v_wholesale_discount,
    v_loyalty_discount,
    greatest(v_subtotal - v_wholesale_discount - v_loyalty_discount, 0),
    coalesce(p_shipping_address, '{}'::jsonb)
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, quantity, unit_price, discount_percent)
  select
    v_order.id,
    ci.product_id,
    ci.quantity,
    p.price,
    p.discount_percent
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = auth.uid();

  update public.products p
  set stock = p.stock - ci.quantity
  from public.cart_items ci
  where ci.user_id = auth.uid()
    and ci.product_id = p.id;

  delete from public.cart_items where user_id = auth.uid();

  insert into public.notifications (user_id, title, body, type)
  values (
    auth.uid(),
    'Order placed',
    'Your order ' || v_order.tracking_code || ' is now being prepared.',
    'order'
  );

  return v_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.wholesale_codes enable row level security;

drop policy if exists "products are public readable" on public.products;
create policy "products are public readable" on public.products for select using (true);

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.current_role() = 'admin') with check (id = auth.uid() or public.current_role() = 'admin');
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "staff manage products" on public.products;
create policy "staff manage products" on public.products for all using (public.current_role() in ('admin', 'marketing')) with check (public.current_role() in ('admin', 'marketing'));

drop policy if exists "users manage own cart" on public.cart_items;
create policy "users manage own cart" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users manage favorites" on public.favorites;
create policy "users manage favorites" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users manage history" on public.watch_history;
create policy "users manage history" on public.watch_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select using (user_id = auth.uid() or public.current_role() in ('admin', 'sales'));

drop policy if exists "sales update orders" on public.orders;
create policy "sales update orders" on public.orders for update using (public.current_role() in ('admin', 'sales')) with check (public.current_role() in ('admin', 'sales'));

drop policy if exists "users create orders" on public.orders;
create policy "users create orders" on public.orders for insert with check (user_id = auth.uid());

create policy "order items readable by participants" on public.order_items for select using (
  order_id in (
    select o.id
    from public.orders o
    where o.user_id = auth.uid()
       or public.current_role() in ('admin', 'sales')
  )
);

create policy "order items insert by participants" on public.order_items for insert with check (
  order_id in (
    select o.id
    from public.orders o
    where o.user_id = auth.uid()
       or public.current_role() in ('admin', 'sales')
  )
);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select using (user_id = auth.uid() or public.current_role() in ('admin', 'sales'));
create policy "staff insert notifications" on public.notifications for insert with check (user_id = auth.uid() or public.current_role() in ('admin', 'sales'));
create policy "users update notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own notifications" on public.notifications for delete using (user_id = auth.uid() or public.current_role() in ('admin', 'sales'));

drop policy if exists "users write own reviews" on public.reviews;
create policy "users write own reviews" on public.reviews for insert with check (user_id = auth.uid());
create policy "users update own reviews" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reviews are public readable" on public.reviews;
create policy "reviews are public readable" on public.reviews for select using (true);

drop policy if exists "chat thread access" on public.chat_threads;
create policy "chat thread access" on public.chat_threads for select using (user_id = auth.uid() or assigned_sales_id = auth.uid() or public.current_role() in ('admin', 'sales'));
create policy "chat thread create" on public.chat_threads for insert with check (user_id = auth.uid() or public.current_role() in ('admin', 'sales'));
create policy "chat thread update" on public.chat_threads for update using (user_id = auth.uid() or assigned_sales_id = auth.uid() or public.current_role() in ('admin', 'sales')) with check (user_id = auth.uid() or assigned_sales_id = auth.uid() or public.current_role() in ('admin', 'sales'));

drop policy if exists "chat message access" on public.chat_messages;
create policy "chat message access" on public.chat_messages for select using (
  thread_id in (
    select t.id
    from public.chat_threads t
    where t.user_id = auth.uid()
       or t.assigned_sales_id = auth.uid()
       or public.current_role() in ('admin', 'sales')
  )
);
create policy "chat message create" on public.chat_messages for insert with check (
  thread_id in (
    select t.id
    from public.chat_threads t
    where t.user_id = auth.uid()
       or t.assigned_sales_id = auth.uid()
       or public.current_role() in ('admin', 'sales')
  )
);

create policy "sales read wholesale codes" on public.wholesale_codes for select using (public.current_role() in ('admin', 'sales'));
create policy "sales create wholesale codes" on public.wholesale_codes for insert with check (public.current_role() in ('admin', 'sales'));
create policy "wholesale code redeemer update" on public.wholesale_codes for update using (public.current_role() in ('admin', 'sales') or redeemed_by = auth.uid()) with check (public.current_role() in ('admin', 'sales') or redeemed_by = auth.uid());

comment on table public.profiles is 'Unified user table for retail, wholesale, admin, sales, and marketing roles.';
comment on table public.chat_messages is 'Realtime conversation records between users, sales agents, and AI fallback.';

