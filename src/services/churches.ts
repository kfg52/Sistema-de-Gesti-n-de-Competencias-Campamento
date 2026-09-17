import { supabase } from '@/lib/supabase'
import { mockChurches } from '@/lib/mockDb'
import type { Church } from '@/types'

const DEMO_DELAY = 200

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

export async function getChurches(): Promise<Church[]> {
  if (!supabase) return simulate([...mockChurches])

  const { data, error } = await supabase.from('churches').select('*').order('name')
  if (error) throw error
  return data as Church[]
}