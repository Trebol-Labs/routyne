-- ═══════════════════════════════════════════════════════════════════════════════
-- Routyne — Supabase Schema
-- Run this in the Supabase SQL Editor to bootstrap the database.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Prerequisites
create extension if not exists "uuid-ossp";

-- ── Routines ──────────────────────────────────────────────────────────────────

create table if not exists public.routines (
  id            text        primary key,
  user_id       uuid        references auth.users not null,
  title         text        not null,
  source_md     text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz
);

alter table public.routines enable row level security;

drop policy if exists "Users own their routines" on public.routines;
create policy "Users own their routines"
  on public.routines for all
  using (auth.uid() = user_id);

-- ── History ───────────────────────────────────────────────────────────────────

create table if not exists public.history (
  id              text        primary key,
  user_id         uuid        references auth.users not null,
  session_idx     int,
  session_title   text        not null,
  completed_at    timestamptz not null,
  total_volume    float,
  duration_secs   int,
  volume_data     jsonb,
  notes           text,
  deleted_at      timestamptz,
  synced_at       timestamptz default now()
);

alter table public.history enable row level security;

drop policy if exists "Users own their history" on public.history;
create policy "Users own their history"
  on public.history for all
  using (auth.uid() = user_id);

create index if not exists history_user_synced on public.history (user_id, synced_at);
create index if not exists history_user_completed on public.history (user_id, completed_at);

-- ── Body Weight ───────────────────────────────────────────────────────────────

create table if not exists public.bodyweight (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  date        date        not null,
  weight      float       not null,
  unit        text        not null default 'kg',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  deleted_at  timestamptz,
  unique(user_id, date)
);

-- Keep existing projects created from older schema versions compatible.
alter table public.bodyweight add column if not exists created_at timestamptz default now();
alter table public.bodyweight add column if not exists updated_at timestamptz default now();
alter table public.bodyweight add column if not exists deleted_at timestamptz;

alter table public.bodyweight enable row level security;

drop policy if exists "Users own their bodyweight" on public.bodyweight;
create policy "Users own their bodyweight"
  on public.bodyweight for all
  using (auth.uid() = user_id);

create index if not exists bodyweight_user_updated on public.bodyweight (user_id, updated_at);
create index if not exists bodyweight_user_date on public.bodyweight (user_id, date);

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id         uuid    primary key references auth.users,
  display_name    text,
  avatar_emoji    text    default '💪',
  weight_unit     text    default 'kg',
  height_cm       int,
  default_rest_s  int     default 90,
  rest_days       int[]   default '{0}',
  preferences     jsonb   default '{}'::jsonb,
  updated_at      timestamptz default now()
);

-- Keep existing projects created from older schema versions compatible.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_emoji text default '💪';
alter table public.profiles add column if not exists weight_unit text default 'kg';
alter table public.profiles add column if not exists height_cm int;
alter table public.profiles add column if not exists default_rest_s int default 90;
alter table public.profiles add column if not exists rest_days int[] default '{0}';
alter table public.profiles add column if not exists preferences jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists updated_at timestamptz default now();
create unique index if not exists profiles_user_id_unique on public.profiles (user_id);

alter table public.profiles enable row level security;

drop policy if exists "Users own their profile" on public.profiles;
create policy "Users own their profile"
  on public.profiles for all
  using (auth.uid() = user_id);

-- ── Push subscriptions ──────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  user_id       uuid        references auth.users not null,
  endpoint      text        not null,
  keys          jsonb       not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  last_sent_at  timestamptz,
  primary key (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users own their push subscriptions" on public.push_subscriptions;
create policy "Users own their push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_endpoint on public.push_subscriptions (user_id, endpoint);

-- ── Notification devices ────────────────────────────────────────────────────

create table if not exists public.notification_devices (
  device_id     text        primary key,
  user_id       uuid        references auth.users not null,
  token         text        not null,
  platform      text        not null check (platform in ('ios', 'android')),
  provider      text        not null default 'fcm',
  app_id        text        not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  last_seen_at  timestamptz default now(),
  disabled_at   timestamptz
);

alter table public.notification_devices enable row level security;

drop policy if exists "Users own their notification devices" on public.notification_devices;
create policy "Users own their notification devices"
  on public.notification_devices for all
  using (auth.uid() = user_id);

create index if not exists notification_devices_user_updated
  on public.notification_devices (user_id, updated_at);

-- ── Sync cursors ──────────────────────────────────────────────────────────────

create table if not exists public.sync_cursors (
  user_id       uuid    primary key references auth.users,
  last_pulled   timestamptz default '1970-01-01',
  last_pushed   timestamptz default '1970-01-01'
);

alter table public.sync_cursors enable row level security;

drop policy if exists "Users own their sync cursor" on public.sync_cursors;
create policy "Users own their sync cursor"
  on public.sync_cursors for all
  using (auth.uid() = user_id);

-- ── Trigger: auto-create profile + cursor on signup ──────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.sync_cursors (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Nutrition profiles ────────────────────────────────────────────────────────

create table if not exists public.nutrition_profiles (
  user_id              uuid        primary key references auth.users,
  weight_kg            float       not null,
  height_cm            int         not null,
  age_years            int         not null,
  sex                  text        not null check (sex in ('male','female')),
  activity_level       text        not null,
  goal                 text        not null check (goal in ('bulk','cut','recomp')),
  experience           text        not null,

  body_fat_pct         float,
  training_days        int,
  training_type        text,
  training_time        text,
  dietary_restrictions text[]      default '{}',
  custom_restrictions  text[]      default '{}',
  budget               text,

  bmr_kcal             int         not null,
  tdee_kcal            int         not null,
  target_kcal          int         not null,
  protein_g            int         not null,
  fats_g               int         not null,
  carbs_g              int         not null,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  deleted_at           timestamptz
);

alter table public.nutrition_profiles enable row level security;

drop policy if exists "Users own their nutrition profile" on public.nutrition_profiles;
create policy "Users own their nutrition profile"
  on public.nutrition_profiles for all
  using (auth.uid() = user_id);

create index if not exists nutrition_profiles_user_updated
  on public.nutrition_profiles (user_id, updated_at);
