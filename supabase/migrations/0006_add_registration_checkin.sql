-- =====================================================
-- Campamento de Varones IDP — Migración 0006
-- Asistencia/Check-in por inscripción (independiente del status)
-- Añade la marca temporal de acreditación a cada inscripción.
-- - checked_in_at NULL  => AÚN no acreditado (NOT_CHECKED_IN)
-- - checked_in_at SET   => acreditado en esa disciplina (CHECKED_IN)
-- El status de la inscripción (REGISTERED/ACTIVE/ELIMINATED/FINISHED/CANCELLED)
-- NO se usa para representar asistencia.
-- Ejecutar en Supabase SQL Editor o mediante Supabase CLI (supabase db push)
-- =====================================================

alter table public.registrations
  add column if not exists checked_in_at timestamptz;

create index if not exists idx_registrations_checked_in
  on public.registrations (checked_in_at)
  where checked_in_at is not null;