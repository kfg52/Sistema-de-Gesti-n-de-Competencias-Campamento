-- =====================================================
-- Campamento de Varones IDP — Migración 0004
-- Control de Cupos por Competencia (Capacidad máxima y anti-overbooking)
-- Ejecutar en Supabase SQL Editor o mediante Supabase CLI (supabase db push)
-- =====================================================

-- 1. Agregar columna max_cupos a public.competitions
alter table public.competitions
  add column if not exists max_cupos int check (max_cupos is null or max_cupos >= 1);

-- 2. Asignar cupos iniciales sugeridos a las 6 disciplinas (si están en null)
update public.competitions set max_cupos = 60 where name = 'Basketball' and max_cupos is null;
update public.competitions set max_cupos = 72 where name = 'Baseball' and max_cupos is null;
update public.competitions set max_cupos = 32 where name = 'Dominó' and max_cupos is null;
update public.competitions set max_cupos = 40 where name = 'Natación' and max_cupos is null;
update public.competitions set max_cupos = 100 where name = 'Carrera campo traviesa' and max_cupos is null;
update public.competitions set max_cupos = 32 where name = 'Ajedrez' and max_cupos is null;

-- 3. Función trigger para prevenir sobrecupo en inscripciones (garantía a nivel de BD)
create or replace function public.check_competition_capacity()
returns trigger as $$
declare
  v_max_cupos int;
  v_current_count int;
  v_comp_name text;
begin
  select name, max_cupos into v_comp_name, v_max_cupos
  from public.competitions
  where id = new.competition_id;

  if v_max_cupos is not null then
    select count(*) into v_current_count
    from public.registrations
    where competition_id = new.competition_id
      and status <> 'CANCELLED';

    if v_current_count >= v_max_cupos then
      raise exception 'Cupo agotado: la competencia "%" ya alcanzó su límite de % participantes', v_comp_name, v_max_cupos;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- 4. Trigger en public.registrations
drop trigger if exists trg_check_competition_capacity on public.registrations;
create trigger trg_check_competition_capacity
  before insert on public.registrations
  for each row execute function public.check_competition_capacity();
