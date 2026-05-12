-- Run this first if Supabase reports:
-- ERROR: 42P01: relation "public.food_logs" does not exist
--
-- After this succeeds, run 001_food_tracker_tables.sql again from the top.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.meal_type as enum ('Breakfast', 'Lunch', 'Dinner', 'Snack');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  calories double precision not null default 2500 check (calories >= 0),
  protein double precision not null default 120 check (protein >= 0),
  carbs double precision not null default 300 check (carbs >= 0),
  fat double precision not null default 80 check (fat >= 0),
  fibre double precision not null default 30 check (fibre >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  meal_type public.meal_type not null,
  dish_name text not null,
  image_uri text,
  calories double precision not null default 0 check (calories >= 0),
  protein double precision not null default 0 check (protein >= 0),
  carbs double precision not null default 0 check (carbs >= 0),
  fat double precision not null default 0 check (fat >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_ingredients (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs(id) on delete cascade,
  name text not null,
  serving text not null,
  calories double precision not null default 0 check (calories >= 0),
  protein double precision not null default 0 check (protein >= 0),
  carbs double precision not null default 0 check (carbs >= 0),
  fat double precision not null default 0 check (fat >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scan_date)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scan_limit integer not null default 20 check (scan_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'daily_goals',
    'food_logs',
    'food_ingredients',
    'scan_usage',
    'user_settings'
  )
order by table_name;
