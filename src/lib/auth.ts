import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

/** Roles con acceso al panel de administración (mismo criterio que public.is_admin()). */
export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']

/** Función equivalente a public.is_admin() del esquema. */
export function roleIsAdmin(role: UserRole | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role)
}

export interface SessionUser {
  id: string
  email: string | null
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no está configurado. Revisa tus variables de entorno VITE_SUPABASE_* .')
    this.name = 'SupabaseNotConfiguredError'
  }
}

function requireClient() {
  if (!supabase) throw new SupabaseNotConfiguredError()
  return supabase
}

/** Identidad de la sesión actual (o null si no hay sesión). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return { id: data.session.user.id, email: data.session.user.email ?? null }
}

/** Perfil (rol) vinculado al usuario autenticado. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

/** Inicio de sesión con email y contraseña (Supabase Auth). */
export async function signInWithPassword(email: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

/** Inicio de sesión con Google (requiere el proveedor configurado en Supabase). */
export async function signInWithGoogle() {
  const client = requireClient()
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/admin' },
  })
  if (error) throw error
}

/** Cerrar sesión. */
export async function signOutApp() {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}