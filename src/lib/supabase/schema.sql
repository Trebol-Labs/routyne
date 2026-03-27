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
  synced_at       timestamptz default now()
);

alter table public.history enable row level security;

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
  unique(user_id, date)
);

alter table public.bodyweight enable row level security;

create policy "Users own their bodyweight"
  on public.bodyweight for all
  using (auth.uid() = user_id);

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id         uuid    primary key references auth.users,
  display_name    text,
  avatar_emoji    text    default '💪',
  weight_unit     text    default 'kg',
  height_cm       int,
  default_rest_s  int     default 90,
  rest_days       int[]   default '{0}',
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users own their profile"
  on public.profiles for all
  using (auth.uid() = user_id);

-- ── Sync cursors ──────────────────────────────────────────────────────────────

create table if not exists public.sync_cursors (
  user_id       uuid    primary key references auth.users,
  last_pulled   timestamptz default '1970-01-01',
  last_pushed   timestamptz default '1970-01-01'
);

alter table public.sync_cursors enable row level security;

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
