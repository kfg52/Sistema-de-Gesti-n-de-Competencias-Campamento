-- =====================================================
-- Campamento de Varones IDP — Migración 0001
-- Esquema inicial completo con restricciones, triggers y RLS
-- Ejecutar en Supabase SQL Editor o con supabase db push
-- =====================================================

-- Extensión para UUIDs y generación segura de tokens
create extension if not exists "pgcrypto";

-- -----------------------------------------------------
-- SEQUENCE para código de participante (CMP-00001)
-- -----------------------------------------------------
create sequence if not exists participants_code_seq start 1 increment 1;

-- -----------------------------------------------------
-- IGLESIAS
-- -----------------------------------------------------
create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- COMPETENCIAS (configurables, sin nada codificado)
-- -----------------------------------------------------
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  tipo text not null check (tipo in ('TEAM', 'INDIVIDUAL')),
  jugadores_por_equipo int not null default 1 check (jugadores_por_equipo >= 1),
  permite_equipos boolean not null default false,
  activa boolean not null default true,
  estado text not null default 'ACTIVE'
    check (estado in ('DRAFT', 'ACTIVE', 'CLOSED', 'FINISHED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- PARTICIPANTES
-- -----------------------------------------------------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (trim(first_name) <> ''),
  last_name text not null check (trim(last_name) <> ''),
  church_id uuid not null references public.churches (id) on delete restrict,
  participant_code text not null unique
    default ('CMP-' || lpad(nextval('participants_code_seq')::text, 5, '0')),
  participant_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_participants_church on public.participants (church_id);
create index if not exists idx_participants_name on public.participants (lower(first_name), lower(last_name));

-- -----------------------------------------------------
-- INSCRIPCIONES
-- Regla crítica: UNIQUE(participant_id, competition_id)
-- Un participante NUNCA puede inscribirse 2 veces en la misma competencia.
-- -----------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  status text not null default 'REGISTERED'
    check (status in ('REGISTERED', 'ACTIVE', 'ELIMINATED', 'FINISHED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  unique (participant_id, competition_id)
);

create index if not exists idx_registrations_competition on public.registrations (competition_id);

-- -----------------------------------------------------
-- EQUIPOS
-- -----------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  name text not null,
  max_players int not null check (max_players >= 1),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'FULL', 'ACTIVE', 'ELIMINATED', 'FINALIST', 'CHAMPION')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, name)
);

create index if not exists idx_teams_competition on public.teams (competition_id);

-- -----------------------------------------------------
-- INTEGRANTES DE EQUIPO
-- Reglas reforzadas por el trigger team_member_guard:
--  - participante debe estar inscrito en la competencia del equipo
--  - participante no puede estar en 2 equipos de la misma competencia
--  - el equipo no puede superar max_players
-- -----------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, participant_id)
);

-- -----------------------------------------------------
-- RONDAS
-- -----------------------------------------------------
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  name text not null,
  round_number int not null check (round_number >= 1),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'COMPLETED')),
  created_at timestamptz not null default now(),
  unique (competition_id, round_number)
);

-- -----------------------------------------------------
-- ENFRENTAMIENTOS
-- Un enfrentamiento usa participantes O equipos, nunca ambos en un mismo lado.
-- -----------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  round_id uuid references public.rounds (id) on delete cascade,
  participant_a_id uuid references public.participants (id) on delete set null,
  participant_b_id uuid references public.participants (id) on delete set null,
  team_a_id uuid references public.teams (id) on delete set null,
  team_b_id uuid references public.teams (id) on delete set null,
  score_a int,
  score_b int,
  winner_participant_id uuid references public.participants (id) on delete set null,
  winner_team_id uuid references public.teams (id) on delete set null,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  next_match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint matches_side_a_check check (
    (participant_a_id is not null and team_a_id is null) or
    (participant_a_id is null and team_a_id is not null) or
    (participant_a_id is null and team_a_id is null)
  ),
  constraint matches_side_b_check check (
    (participant_b_id is not null and team_b_id is null) or
    (participant_b_id is null and team_b_id is not null) or
    (participant_b_id is null and team_b_id is null)
  ),
  constraint matches_scale_check check (
    status <> 'COMPLETED'
    or (score_a is not null and score_b is not null)
  ),
  constraint matches_no_tie_when_completed check (
    status <> 'COMPLETED'
    or (winner_participant_id is not null or winner_team_id is not null)
  )
);

create index if not exists idx_matches_competition on public.matches (competition_id);
create index if not exists idx_matches_round on public.matches (round_id);

-- -----------------------------------------------------
-- CONFIGURACIÓN DE PUNTOS (clasificación por iglesia)
-- Valores editables desde administración.
-- -----------------------------------------------------
create table if not exists public.ranking_points (
  id uuid primary key default gen_random_uuid(),
  first_place int not null default 10,
  second_place int not null default 6,
  third_place int not null default 4,
  participation int not null default 2,
  victory int not null default 3,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- PERFILES (roles de administración, vinculados a Supabase Auth)
-- -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'ORGANIZER'
    check (role in ('SUPER_ADMIN', 'ADMIN', 'ORGANIZER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- AUDITORÍA
-- -----------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Actualizar updated_at de forma automática
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_competitions_updated
  before update on public.competitions
  for each row execute function public.set_updated_at();

create trigger trg_participants_updated
  before update on public.participants
  for each row execute function public.set_updated_at();

create trigger trg_teams_updated
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger trg_ranking_points_updated
  before update on public.ranking_points
  for each row execute function public.set_updated_at();

-- Crear perfil automáticamente al registrarse un usuario administrador
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'ORGANIZER');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_admin_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guarda de integridad para integrantes de equipo
create or replace function public.team_member_guard()
returns trigger as $$
declare
  v_competition_id uuid;
  v_max_players int;
begin
  select t.competition_id, t.max_players
    into v_competition_id, v_max_players
    from public.teams t
   where t.id = new.team_id;

  if not exists (
    select 1 from public.registrations r
    where r.participant_id = new.participant_id
      and r.competition_id = v_competition_id
  ) then
    raise exception 'El participante no está inscrito en esta competencia';
  end if;

  if exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.participant_id = new.participant_id
      and t.competition_id = v_competition_id
  ) then
    raise exception 'El participante ya pertenece a otro equipo de esta competencia';
  end if;

  if (select count(*) from public.team_members where team_id = new.team_id) >= v_max_players then
    raise exception 'El equipo ya alcanzó su cupo máximo';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_team_member_guard
  before insert on public.team_members
  for each row execute function public.team_member_guard();

-- Comprobar si el usuario autenticado es administrador/organizador
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUPER_ADMIN', 'ADMIN', 'ORGANIZER')
  );
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- Lectura pública (tablero de resultados visible).
-- Escritura: admin/organizador; registro propio sin cuenta.
-- =====================================================

alter table public.churches enable row level security;
alter table public.competitions enable row level security;
alter table public.participants enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.ranking_points enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- IGLESIAS: lectura pública
drop policy if exists "churches_public_read" on public.churches;
create policy "churches_public_read"
  on public.churches for select using (true);

-- COMPETENCIAS: lectura pública, escritura admin
drop policy if exists "competitions_public_read" on public.competitions;
create policy "competitions_public_read"
  on public.competitions for select using (true);

drop policy if exists "competitions_admin_write" on public.competitions;
create policy "competitions_admin_write"
  on public.competitions for all using (public.is_admin()) with check (public.is_admin());

-- PARTICIPANTES: lectura pública; alta sin cuenta (auto-registro);
-- actualización/borrado solo admin.
drop policy if exists "participants_public_read" on public.participants;
create policy "participants_public_read"
  on public.participants for select using (true);

drop policy if exists "participants_self_insert" on public.participants;
create policy "participants_self_insert"
  on public.participants for insert
  with check (public.is_admin() or auth.uid() is null);

drop policy if exists "participants_admin_update" on public.participants;
create policy "participants_admin_update"
  on public.participants for update using (public.is_admin()) with check (public.is_admin());

-- INSCRIPCIONES: lectura pública; alta sin cuenta; escritura admin.
drop policy if exists "registrations_public_read" on public.registrations;
create policy "registrations_public_read"
  on public.registrations for select using (true);

drop policy if exists "registrations_self_insert" on public.registrations;
create policy "registrations_self_insert"
  on public.registrations for insert
  with check (public.is_admin() or auth.uid() is null);

drop policy if exists "registrations_admin_update" on public.registrations;
create policy "registrations_admin_update"
  on public.registrations for update using (public.is_admin()) with check (public.is_admin());

-- EQUIPOS: lectura pública, escritura admin.
drop policy if exists "teams_public_read" on public.teams;
create policy "teams_public_read"
  on public.teams for select using (true);

drop policy if exists "teams_admin_write" on public.teams;
create policy "teams_admin_write"
  on public.teams for all using (public.is_admin()) with check (public.is_admin());

-- INTEGRANTES: lectura pública, escritura admin.
drop policy if exists "team_members_public_read" on public.team_members;
create policy "team_members_public_read"
  on public.team_members for select using (true);

drop policy if exists "team_members_admin_write" on public.team_members;
create policy "team_members_admin_write"
  on public.team_members for all using (public.is_admin()) with check (public.is_admin());

-- RONDAS: lectura pública, escritura admin.
drop policy if exists "rounds_public_read" on public.rounds;
create policy "rounds_public_read"
  on public.rounds for select using (true);

drop policy if exists "rounds_admin_write" on public.rounds;
create policy "rounds_admin_write"
  on public.rounds for all using (public.is_admin()) with check (public.is_admin());

-- ENFRENTAMIENTOS: lectura pública, escritura admin.
drop policy if exists "matches_public_read" on public.matches;
create policy "matches_public_read"
  on public.matches for select using (true);

drop policy if exists "matches_admin_write" on public.matches;
create policy "matches_admin_write"
  on public.matches for all using (public.is_admin()) with check (public.is_admin());

-- PUNTOS DE CLASIFICACIÓN: lectura pública, escritura admin.
drop policy if exists "ranking_points_public_read" on public.ranking_points;
create policy "ranking_points_public_read"
  on public.ranking_points for select using (true);

drop policy if exists "ranking_points_admin_write" on public.ranking_points;
create policy "ranking_points_admin_write"
  on public.ranking_points for all using (public.is_admin()) with check (public.is_admin());

-- PERFILES: el usuario ve su propio perfil; admin ve todos.
drop policy if exists "profiles_own_read" on public.profiles;
create policy "profiles_own_read"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read"
  on public.profiles for select using (public.is_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write"
  on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- AUDITORÍA: solo lectura/escritura para administradores.
drop policy if exists "audit_logs_admin_all" on public.audit_logs;
create policy "audit_logs_admin_all"
  on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());