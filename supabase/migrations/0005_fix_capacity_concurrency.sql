-- =====================================================
-- Campamento de Varones IDP — Migración 0005
-- Fix concurrencia: anti-overbooking sin condición de carrera
-- Reemplaza check_competition_capacity() por una versión que
-- bloquea la fila de la competencia (SELECT ... FOR UPDATE), de modo
-- que dos inserciones simultáneas en la misma disciplina se serializan
-- y el conteo de registrados siempre es exacto.
-- Ejecutar en Supabase SQL Editor o mediante Supabase CLI (supabase db push)
-- =====================================================

create or replace function public.check_competition_capacity()
returns trigger as $$
declare
  v_max_cupos int;
  v_current_count int;
  v_comp_name text;
begin
  -- Lock de fila: la transacción que inserta retiene el lock de la
  -- competencia hasta commit/rollback. Los inserts concurrentes de la
  -- misma disciplina esperan; el conteo posterior ve los rows commiteados.
  select name, max_cupos into v_comp_name, v_max_cupos
  from public.competitions
  where id = new.competition_id
  for update;

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

drop trigger if exists trg_check_competition_capacity on public.registrations;
create trigger trg_check_competition_capacity
  before insert on public.registrations
  for each row execute function public.check_competition_capacity();