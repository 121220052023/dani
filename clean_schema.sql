create extension if not exists "uuid-ossp";

-- 1. users
create table public.app_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null default 'retail',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. wholesale_codes
create table public.wholesale_codes (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  created_by uuid references public.app_users(id),
  is_used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. products
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  discount numeric default 0,
  stock integer not null default 0,
  category text not null,
  brand text,
  tags text[],
  image_url text,
  is_best_seller boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. orders
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) on delete cascade,
  total_price numeric not null,
  status text not null default 'Preparing',
  tracking_code text unique,
  payment_method text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. order_items
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity integer not null,
  price numeric not null
);

-- 6. reviews
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id),
  product_id uuid references public.products(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. cart
create table public.cart (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. favorites
create table public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

-- 9. notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. chat_messages
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.app_users(id),
  receiver_id uuid references public.app_users(id),
  message text not null,
  is_ai boolean default false,
  is_answered boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;
create policy "Public can view products" on public.products for select using (true);
