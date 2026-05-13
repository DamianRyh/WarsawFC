-- WARSAW FC Matchday OS 1.6
-- Cloud Snapshot table for current frontend sync
-- Wklej w Supabase SQL Editor i uruchom po wcześniejszym patchu bazy.

begin;

create extension if not exists "uuid-ossp";

create table if not exists public.matchday_snapshots (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  title text not null default 'WARSAW FC MATCHDAY',
  season text default 'S03',
  event_date date default current_date,
  is_public boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.matchday_snapshots enable row level security;

drop trigger if exists set_matchday_snapshots_updated_at on public.matchday_snapshots;
create trigger set_matchday_snapshots_updated_at
before update on public.matchday_snapshots
for each row execute function public.set_updated_at();

drop policy if exists "Public can read public matchday snapshots" on public.matchday_snapshots;
drop policy if exists "Admins can manage matchday snapshots" on public.matchday_snapshots;

create policy "Public can read public matchday snapshots"
on public.matchday_snapshots
for select
using (is_public = true or public.is_wfc_admin());

create policy "Admins can manage matchday snapshots"
on public.matchday_snapshots
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

create index if not exists matchday_snapshots_code_idx on public.matchday_snapshots (code);
create index if not exists matchday_snapshots_updated_at_idx on public.matchday_snapshots (updated_at desc);
create index if not exists matchday_snapshots_is_public_idx on public.matchday_snapshots (is_public);

grant select on public.matchday_snapshots to anon, authenticated;
grant insert, update, delete on public.matchday_snapshots to authenticated;

commit;
