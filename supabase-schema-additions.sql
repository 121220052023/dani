-- ============================================================================
-- NEW TABLES FOR ENHANCED FEATURES
-- ============================================================================

-- User Saved Addresses
create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  full_name text not null,
  phone text not null,
  city text not null,
  street text not null,
  building text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product Comments/Reviews with Star Rating
create table if not exists public.product_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  comment text,
  is_verified_purchase boolean not null default false,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- Product Ratings Summary (cached for performance)
create table if not exists public.product_ratings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  average_rating numeric(3,2) not null default 0,
  total_reviews integer not null default 0,
  rating_1_count integer not null default 0,
  rating_2_count integer not null default 0,
  rating_3_count integer not null default 0,
  rating_4_count integer not null default 0,
  rating_5_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists last_seen_at timestamptz not null default now();

update public.profiles
set last_seen_at = coalesce(last_seen_at, created_at, now())
where last_seen_at is null;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
alter table public.user_addresses enable row level security;
alter table public.product_comments enable row level security;
alter table public.product_ratings enable row level security;

-- User Addresses RLS
create policy "Users can view their own addresses"
  on public.user_addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own addresses"
  on public.user_addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own addresses"
  on public.user_addresses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own addresses"
  on public.user_addresses for delete
  using (auth.uid() = user_id);

create policy "Admins can view all addresses"
  on public.user_addresses for select
  using (public.current_role() = 'admin');

-- Product Comments RLS
create policy "Anyone can view product comments"
  on public.product_comments for select
  using (true);

create policy "Users can insert their own comments"
  on public.product_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.product_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.product_comments for delete
  using (auth.uid() = user_id);

create policy "Admins can delete any comment"
  on public.product_comments for delete
  using (public.current_role() = 'admin');

-- Product Ratings RLS
create policy "Anyone can view product ratings"
  on public.product_ratings for select
  using (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update product ratings when a comment is added/updated/deleted
create or replace function public.update_product_ratings()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    update public.product_ratings
    set
      total_reviews = total_reviews - 1,
      rating_1_count = case when old.rating = 1 then rating_1_count - 1 else rating_1_count end,
      rating_2_count = case when old.rating = 2 then rating_2_count - 1 else rating_2_count end,
      rating_3_count = case when old.rating = 3 then rating_3_count - 1 else rating_3_count end,
      rating_4_count = case when old.rating = 4 then rating_4_count - 1 else rating_4_count end,
      rating_5_count = case when old.rating = 5 then rating_5_count - 1 else rating_5_count end,
      updated_at = now()
    where product_id = old.product_id;
  else
    insert into public.product_ratings (product_id)
    values (new.product_id)
    on conflict (product_id) do nothing;

    update public.product_ratings
    set
      total_reviews = coalesce((select count(*) from public.product_comments where product_id = new.product_id), 0),
      rating_1_count = coalesce((select count(*) from public.product_comments where product_id = new.product_id and rating = 1), 0),
      rating_2_count = coalesce((select count(*) from public.product_comments where product_id = new.product_id and rating = 2), 0),
      rating_3_count = coalesce((select count(*) from public.product_comments where product_id = new.product_id and rating = 3), 0),
      rating_4_count = coalesce((select count(*) from public.product_comments where product_id = new.product_id and rating = 4), 0),
      rating_5_count = coalesce((select count(*) from public.product_comments where product_id = new.product_id and rating = 5), 0),
      average_rating = coalesce((select round(avg(rating)::numeric, 2) from public.product_comments where product_id = new.product_id), 0),
      updated_at = now()
    where product_id = new.product_id;
  end if;
  return null;
end;
$$;

-- Trigger for updating ratings
drop trigger if exists trigger_update_product_ratings on public.product_comments;
create trigger trigger_update_product_ratings
  after insert or update or delete on public.product_comments
  for each row execute function public.update_product_ratings();

-- Function to update timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists trigger_user_addresses_updated_at on public.user_addresses;
create trigger trigger_user_addresses_updated_at
  before update on public.user_addresses
  for each row execute function public.update_updated_at();

drop trigger if exists trigger_product_comments_updated_at on public.product_comments;
create trigger trigger_product_comments_updated_at
  before update on public.product_comments
  for each row execute function public.update_updated_at();
