-- WARSAW FC BASE → MATCHDAY OS 1.6
-- PATCH DO ISTNIEJĄCEJ BAZY SUPABASE
-- Wklej w: Supabase → Database → SQL Editor → New query → Run
--
-- Ten plik NIE kasuje Twoich obecnych tabel.
-- Rozszerza istniejącą strukturę: profiles, events, event_players, matches, goals.
--
-- Po uruchomieniu ustaw siebie jako admina:
-- update public.profiles set role = 'admin' where id = auth.uid();
-- albo ręcznie w Table Editor → profiles → role = admin.

begin;

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================
-- UPDATED_AT HELPER
-- =========================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- ADMIN HELPER
-- =========================================

create or replace function public.is_wfc_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'owner')
  );
$$;

-- =========================================
-- PROFILES PATCH
-- =========================================

alter table public.profiles
  add column if not exists updated_at timestamptz default now(),
  add column if not exists district text,
  add column if not exists birth_year integer,
  add column if not exists dominant_foot text,
  add column if not exists is_active boolean default true;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('player', 'admin', 'owner'));

alter table public.profiles
  drop constraint if exists profiles_birth_year_check;

alter table public.profiles
  add constraint profiles_birth_year_check
  check (birth_year is null or birth_year between 1950 and 2035);

alter table public.profiles
  drop constraint if exists profiles_dominant_foot_check;

alter table public.profiles
  add constraint profiles_dominant_foot_check
  check (dominant_foot is null or dominant_foot in ('left', 'right', 'both'));

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS policies refresh
drop policy if exists "Admins can manage all profiles" on public.profiles;

create policy "Admins can manage all profiles"
on public.profiles
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- EVENTS PATCH
-- =========================================

alter table public.events
  add column if not exists updated_at timestamptz default now(),
  add column if not exists location text,
  add column if not exists match_minutes integer default 5,
  add column if not exists pitch_count integer default 3,
  add column if not exists team_count integer default 6,
  add column if not exists schedule_mode text default 'double',
  add column if not exists is_public boolean default true,
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('planned', 'open', 'live', 'completed', 'closed', 'cancelled'));

alter table public.events
  drop constraint if exists events_match_minutes_check;

alter table public.events
  add constraint events_match_minutes_check
  check (match_minutes between 1 and 60);

alter table public.events
  drop constraint if exists events_pitch_count_check;

alter table public.events
  add constraint events_pitch_count_check
  check (pitch_count between 1 and 10);

alter table public.events
  drop constraint if exists events_team_count_check;

alter table public.events
  add constraint events_team_count_check
  check (team_count between 2 and 10);

alter table public.events
  drop constraint if exists events_schedule_mode_check;

alter table public.events
  add constraint events_schedule_mode_check
  check (schedule_mode in ('single', 'double'));

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- Make public event policy respect is_public, but keep admin access.
drop policy if exists "Events visible for everyone" on public.events;
drop policy if exists "Admins manage events" on public.events;

create policy "Public can read public events"
on public.events
for select
using (is_public = true or public.is_wfc_admin());

create policy "Admins manage events"
on public.events
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- EVENT PLAYERS PATCH
-- =========================================

alter table public.event_players
  add column if not exists status text default 'present';

alter table public.event_players
  drop constraint if exists event_players_status_check;

alter table public.event_players
  add constraint event_players_status_check
  check (status in ('invited', 'confirmed', 'present', 'absent'));

drop policy if exists "Attendance visible" on public.event_players;
drop policy if exists "Players join attendance" on public.event_players;
drop policy if exists "Admins manage attendance" on public.event_players;

create policy "Public can read attendance for public events"
on public.event_players
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = event_players.event_id
      and (e.is_public = true or public.is_wfc_admin())
  )
);

create policy "Players can join attendance"
on public.event_players
for insert
with check (auth.uid() = player_id);

create policy "Admins manage attendance"
on public.event_players
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- TEAMS
-- =========================================

create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(event_id, name)
);

alter table public.teams enable row level security;

drop policy if exists "Public can read teams for public events" on public.teams;
drop policy if exists "Admins manage teams" on public.teams;

create policy "Public can read teams for public events"
on public.teams
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = teams.event_id
      and (e.is_public = true or public.is_wfc_admin())
  )
);

create policy "Admins manage teams"
on public.teams
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- TEAM PLAYERS
-- =========================================

create table if not exists public.team_players (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(event_id, player_id)
);

alter table public.team_players enable row level security;

drop policy if exists "Public can read team players for public events" on public.team_players;
drop policy if exists "Admins manage team players" on public.team_players;

create policy "Public can read team players for public events"
on public.team_players
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = team_players.event_id
      and (e.is_public = true or public.is_wfc_admin())
  )
);

create policy "Admins manage team players"
on public.team_players
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- MATCHES PATCH
-- =========================================

alter table public.matches
  add column if not exists updated_at timestamptz default now(),
  add column if not exists round_no integer default 1,
  add column if not exists pitch_no integer,
  add column if not exists home_team_id uuid references public.teams(id) on delete set null,
  add column if not exists away_team_id uuid references public.teams(id) on delete set null,
  add column if not exists home_score integer,
  add column if not exists away_score integer,
  add column if not exists status text default 'planned',
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

-- Sync old column names into new ones where possible.
update public.matches
set
  pitch_no = coalesce(pitch_no, pitch),
  home_score = coalesce(home_score, score_a, 0),
  away_score = coalesce(away_score, score_b, 0)
where pitch_no is null
   or home_score is null
   or away_score is null;

alter table public.matches
  alter column home_score set default 0,
  alter column away_score set default 0;

alter table public.matches
  drop constraint if exists matches_round_no_check;

alter table public.matches
  add constraint matches_round_no_check
  check (round_no >= 1);

alter table public.matches
  drop constraint if exists matches_pitch_no_check;

alter table public.matches
  add constraint matches_pitch_no_check
  check (pitch_no is null or pitch_no >= 1);

alter table public.matches
  drop constraint if exists matches_scores_check;

alter table public.matches
  add constraint matches_scores_check
  check (
    (home_score is null or home_score >= 0)
    and
    (away_score is null or away_score >= 0)
  );

alter table public.matches
  drop constraint if exists matches_status_check;

alter table public.matches
  add constraint matches_status_check
  check (status in ('planned', 'live', 'finished', 'completed', 'cancelled'));

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop policy if exists "Matches visible" on public.matches;
drop policy if exists "Admins manage matches" on public.matches;

create policy "Public can read matches for public events"
on public.matches
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = matches.event_id
      and (e.is_public = true or public.is_wfc_admin())
  )
);

create policy "Admins manage matches"
on public.matches
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- GOALS PATCH
-- =========================================

alter table public.goals
  add column if not exists event_id uuid references public.events(id) on delete cascade,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists minute integer,
  add column if not exists is_own_goal boolean default false,
  add column if not exists note text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Fill event_id from match relation.
update public.goals g
set event_id = m.event_id
from public.matches m
where g.match_id = m.id
  and g.event_id is null;

alter table public.goals
  drop constraint if exists goals_minute_check;

alter table public.goals
  add constraint goals_minute_check
  check (minute is null or minute between 0 and 120);

drop policy if exists "Goals visible" on public.goals;
drop policy if exists "Admins manage goals" on public.goals;

create policy "Public can read goals for public events"
on public.goals
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = goals.event_id
      and (e.is_public = true or public.is_wfc_admin())
  )
);

create policy "Admins manage goals"
on public.goals
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

-- =========================================
-- APP SETTINGS
-- =========================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

drop policy if exists "Public can read app settings" on public.app_settings;
drop policy if exists "Admins manage app settings" on public.app_settings;

create policy "Public can read app settings"
on public.app_settings
for select
using (true);

create policy "Admins manage app settings"
on public.app_settings
for all
using (public.is_wfc_admin())
with check (public.is_wfc_admin());

insert into public.app_settings (key, value)
values (
  'app',
  '{"name":"WARSAW FC Matchday OS","version":"1.6.0","mode":"warsaw_fc"}'::jsonb
)
on conflict (key)
do update set value = excluded.value;

-- =========================================
-- VIEWS
-- =========================================

drop view if exists public.player_goal_ranking_view;
drop view if exists public.event_matchday_view;
drop view if exists public.season_stats;

create view public.season_stats as
select
  p.id,
  p.nickname,
  p.full_name,
  p.avatar_url,
  p.instagram,
  p.position,
  p.role,
  count(distinct ep.event_id)::integer as appearances,
  count(g.id)::integer as goals
from public.profiles p
left join public.event_players ep
  on ep.player_id = p.id
left join public.goals g
  on g.player_id = p.id
where coalesce(p.is_active, true) = true
group by p.id, p.nickname, p.full_name, p.avatar_url, p.instagram, p.position, p.role;

create view public.event_matchday_view as
select
  e.id as event_id,
  e.code,
  e.title,
  e.season,
  e.event_date,
  e.location,
  e.status as event_status,
  e.match_minutes,
  e.pitch_count,
  e.team_count,
  e.schedule_mode,
  m.id as match_id,
  m.round_no,
  coalesce(m.pitch_no, m.pitch) as pitch_no,
  m.status as match_status,
  coalesce(ht.name, m.team_a) as home_team,
  coalesce(at.name, m.team_b) as away_team,
  coalesce(m.home_score, m.score_a, 0) as home_score,
  coalesce(m.away_score, m.score_b, 0) as away_score
from public.events e
left join public.matches m on m.event_id = e.id
left join public.teams ht on ht.id = m.home_team_id
left join public.teams at on at.id = m.away_team_id
where e.is_public = true;

create view public.player_goal_ranking_view as
select
  p.id as player_id,
  p.nickname,
  p.full_name,
  p.avatar_url,
  count(g.id)::integer as goals,
  count(distinct ep.event_id)::integer as appearances
from public.profiles p
left join public.goals g on g.player_id = p.id
left join public.event_players ep on ep.player_id = p.id
where coalesce(p.is_active, true) = true
group by p.id, p.nickname, p.full_name, p.avatar_url
order by goals desc, appearances desc, nickname asc;

-- =========================================
-- INDEXES
-- =========================================

create index if not exists profiles_nickname_idx on public.profiles (nickname);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_is_active_idx on public.profiles (is_active);

create index if not exists events_code_idx on public.events (code);
create index if not exists events_season_idx on public.events (season);
create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists events_status_idx on public.events (status);

create index if not exists event_players_event_id_idx on public.event_players (event_id);
create index if not exists event_players_player_id_idx on public.event_players (player_id);

create index if not exists teams_event_id_idx on public.teams (event_id);
create index if not exists team_players_event_id_idx on public.team_players (event_id);
create index if not exists team_players_team_id_idx on public.team_players (team_id);
create index if not exists team_players_player_id_idx on public.team_players (player_id);

create index if not exists matches_event_id_idx on public.matches (event_id);
create index if not exists matches_round_no_idx on public.matches (event_id, round_no);
create index if not exists matches_status_idx on public.matches (status);

create index if not exists goals_event_id_idx on public.goals (event_id);
create index if not exists goals_match_id_idx on public.goals (match_id);
create index if not exists goals_player_id_idx on public.goals (player_id);
create index if not exists goals_team_id_idx on public.goals (team_id);
create index if not exists goals_created_at_idx on public.goals (created_at);

-- =========================================
-- GRANTS FOR SUPABASE API
-- =========================================

grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.event_players to anon, authenticated;
grant select on public.teams to anon, authenticated;
grant select on public.team_players to anon, authenticated;
grant select on public.matches to anon, authenticated;
grant select on public.goals to anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant select on public.season_stats to anon, authenticated;
grant select on public.event_matchday_view to anon, authenticated;
grant select on public.player_goal_ranking_view to anon, authenticated;

grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert, update, delete on public.event_players to authenticated;
grant insert, update, delete on public.teams to authenticated;
grant insert, update, delete on public.team_players to authenticated;
grant insert, update, delete on public.matches to authenticated;
grant insert, update, delete on public.goals to authenticated;
grant insert, update, delete on public.app_settings to authenticated;

commit;

-- =========================================
-- ADMIN SETUP — uruchom osobno po zalogowaniu
-- =========================================
-- Jeśli masz już swój profil w tabeli profiles:
--
-- update public.profiles
-- set role = 'admin'
-- where id = auth.uid();
--
-- Jeśli robisz to z SQL Editora jako owner projektu i znasz UUID użytkownika:
--
-- update public.profiles
-- set role = 'admin'
-- where id = 'WKLEJ_UUID_UZYTKOWNIKA_Z_AUTH_USERS';
