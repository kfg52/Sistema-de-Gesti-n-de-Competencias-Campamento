import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined

// La "publishable key" es el nombre actual de la "anon key" (mismo valor).
// Soportamos ambos nombres para no romper configuraciones existentes.
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

/** Verdadero cuando las variables de entorno de Supabase están configuradas. */
export const isSupabaseConfigured = Boolean(url && key)

/**
 * Cliente de Supabase. Solo se crea si las variables de entorno existen.
 * Si no, la app se mantiene y las pantallas que consultan datos reales
 * deben notificar el estado de configuración en vez de ocultarlo.
 * Esta clave es PÚBLICA por diseño (anon / publishable), nunca una secret key.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!)
  : null