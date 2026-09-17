import { supabase } from '@/lib/supabase'
import {
  mockCompetitions,
  mockMatches,
  mockTeams,
  participantsBuffer,
  registrationsBuffer,
} from '@/lib/mockDb'
import type { DashboardStats } from '@/types'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

/** Estadísticas globales para el inicio y el dashboard administrativo. */
export async function getDashboardStats(): Promise<DashboardStats> {
  if (!supabase) {
    return simulate({
      participants: participantsBuffer.length,
      registrations: registrationsBuffer.length,
      competitions_active: mockCompetitions.filter((c) => c.activa && c.estado === 'ACTIVE').length,
      teams: mockTeams.length,
      matches_pending: mockMatches.filter((m) => m.status === 'SCHEDULED').length,
      matches_completed: mockMatches.filter((m) => m.status === 'COMPLETED').length,
      competitions_finished: mockCompetitions.filter((c) => c.estado === 'FINISHED').length,
    })
  }

  const db = supabase

  const count = async (
    table: string,
    eq?: { column: string; value: string },
  ) => {
    let query = db.from(table).select('*', { count: 'exact', head: true })
    if (eq) query = query.eq(eq.column, eq.value)
    const { count: n, error } = await query
    if (error) throw error
    return n ?? 0
  }

  const [participants, registrations, teams, pending, completed, finished, active] =
    await Promise.all([
      count('participants'),
      count('registrations'),
      count('teams'),
      count('matches', { column: 'status', value: 'SCHEDULED' }),
      count('matches', { column: 'status', value: 'COMPLETED' }),
      count('competitions', { column: 'estado', value: 'FINISHED' }),
      count('competitions', { column: 'estado', value: 'ACTIVE' }),
    ])

  return {
    participants,
    registrations,
    teams,
    matches_pending: pending,
    matches_completed: completed,
    competitions_finished: finished,
    competitions_active: active,
  }
}