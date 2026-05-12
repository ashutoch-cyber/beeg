-- Beeg food tracker schema for Supabase/Postgres.
-- Run this whole file from the top in the Supabase SQL Editor.
-- Safe to run more than once: objects are created only if missing.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.meal_type as enum ('Breakfast', 'Lunch', 'Dinner', 'Snack');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create index if not exists food_logs_user_date_idx on public.food_logs(user_id, date desc);
create index if not exists food_logs_logged_at_idx on public.food_logs(logged_at desc);
create index if not exists food_ingredients_food_log_id_idx on public.food_ingredients(food_log_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists daily_goals_set_updated_at on public.daily_goals;
create trigger daily_goals_set_updated_at
before update on public.daily_goals
for each row execute function public.set_updated_at();

drop trigger if exists food_logs_set_updated_at on public.food_logs;
create trigger food_logs_set_updated_at
before update on public.food_logs
for each row execute function public.set_updated_at();

drop trigger if exists scan_usage_set_updated_at on public.scan_usage;
create trigger scan_usage_set_updated_at
before update on public.scan_usage
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.daily_goals enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_ingredients enable row level security;
alter table public.scan_usage enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists daily_goals_all_own on public.daily_goals;
create policy daily_goals_all_own
on public.daily_goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_logs_all_own on public.food_logs;
create policy food_logs_all_own
on public.food_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_ingredients_select_own on public.food_ingredients;
create policy food_ingredients_select_own
on public.food_ingredients for select
using (
  exists (
    select 1
    from public.food_logs
    where food_logs.id = food_ingredients.food_log_id
      and food_logs.user_id = auth.uid()
  )
);

drop policy if exists food_ingredients_insert_own on public.food_ingredients;
create policy food_ingredients_insert_own
on public.food_ingredients for insert
with check (
  exists (
    select 1
    from public.food_logs
    where food_logs.id = food_ingredients.food_log_id
      and food_logs.user_id = auth.uid()
  )
);

drop policy if exists food_ingredients_update_own on public.food_ingredients;
create policy food_ingredients_update_own
on public.food_ingredients for update
using (
  exists (
    select 1
    from public.food_logs
    where food_logs.id = food_ingredients.food_log_id
      and food_logs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.food_logs
    where food_logs.id = food_ingredients.food_log_id
      and food_logs.user_id = auth.uid()
  )
);

drop policy if exists food_ingredients_delete_own on public.food_ingredients;
create policy food_ingredients_delete_own
on public.food_ingredients for delete
using (
  exists (
    select 1
    from public.food_logs
    where food_logs.id = food_ingredients.food_log_id
      and food_logs.user_id = auth.uid()
  )
);

drop policy if exists scan_usage_all_own on public.scan_usage;
create policy scan_usage_all_own
on public.scan_usage for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_settings_all_own on public.user_settings;
create policy user_settings_all_own
on public.user_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.daily_goals (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_beeg_defaults on auth.users;
create trigger on_auth_user_created_beeg_defaults
after insert on auth.users
for each row execute function public.handle_new_user_defaults();
