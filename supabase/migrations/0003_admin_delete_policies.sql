-- =====================================================
-- Campamento de Varones IDP — Migración 0003
-- Habilitar políticas DELETE para administradores en participants y registrations
-- Ejecutar en Supabase SQL Editor o mediante Supabase CLI (supabase db push)
-- =====================================================

-- 1. PARTICIPANTES: permitir DELETE a administradores/organizadores (SUPER_ADMIN, ADMIN, ORGANIZER)
drop policy if exists "participants_admin_delete" on public.participants;
create policy "participants_admin_delete"
  on public.participants for delete
  using (public.is_admin());

-- 2. INSCRIPCIONES: permitir DELETE a administradores/organizadores (SUPER_ADMIN, ADMIN, ORGANIZER)
drop policy if exists "registrations_admin_delete" on public.registrations;
create policy "registrations_admin_delete"
  on public.registrations for delete
  using (public.is_admin());
