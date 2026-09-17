import { supabase } from '@/lib/supabase'
import { mockCompetitions, registrationsBuffer } from '@/lib/mockDb'
import type { Competition, CompetitionWithStats } from '@/types'

const DEMO_DELAY = 200

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

function attachStats(
  competitions: Competition[],
  countsByComp: Map<string, number>,
): CompetitionWithStats[] {
  return competitions.map((comp) => {
    const registrations_count = countsByComp.get(comp.id) ?? 0
    const max_cupos = comp.max_cupos ?? null
    const cupos_disponibles =
      max_cupos !== null ? Math.max(0, max_cupos - registrations_count) : null
    const is_full = max_cupos !== null && registrations_count >= max_cupos

    return {
      ...comp,
      registrations_count,
      cupos_disponibles,
      is_full,
    }
  })
}

export async function getCompetitions(): Promise<Competition[]> {
  if (!supabase) return simulate([...mockCompetitions])

  const { data, error } = await supabase.from('competitions').select('*').order('name')
  if (error) throw error
  return data as Competition[]
}

export async function getActiveCompetitions(): Promise<Competition[]> {
  const all = await getCompetitions()
  return all.filter((c) => c.activa && c.estado === 'ACTIVE')
}

export async function getCompetitionsWithStats(): Promise<CompetitionWithStats[]> {
  if (!supabase) {
    const counts = new Map<string, number>()
    for (const r of registrationsBuffer) {
      if (r.status !== 'CANCELLED') {
        counts.set(r.competition_id, (counts.get(r.competition_id) ?? 0) + 1)
      }
    }
    return simulate(attachStats([...mockCompetitions], counts))
  }

  const [compsRes, regsRes] = await Promise.all([
    supabase.from('competitions').select('*').order('name'),
    supabase.from('registrations').select('competition_id').neq('status', 'CANCELLED'),
  ])

  if (compsRes.error) throw compsRes.error
  if (regsRes.error) throw regsRes.error

  const counts = new Map<string, number>()
  for (const r of regsRes.data ?? []) {
    counts.set(r.competition_id, (counts.get(r.competition_id) ?? 0) + 1)
  }

  return attachStats(compsRes.data as Competition[], counts)
}

export async function getActiveCompetitionsWithStats(): Promise<CompetitionWithStats[]> {
  const all = await getCompetitionsWithStats()
  return all.filter((c) => c.activa && c.estado === 'ACTIVE')
}

export async function getCompetitionById(id: string): Promise<Competition | null> {
  if (!supabase) return simulate(mockCompetitions.find((c) => c.id === id) ?? null)

  const { data, error } = await supabase.from('competitions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Competition) ?? null
}

export interface UpdateCompetitionInput {
  name?: string
  description?: string | null
  tipo?: Competition['tipo']
  jugadores_por_equipo?: number
  permite_equipos?: boolean
  max_cupos?: number | null
  activa?: boolean
  estado?: Competition['estado']
}

/** Actualiza la configuración de una competencia (solo admin). */
export async function updateCompetition(
  id: string,
  input: UpdateCompetitionInput,
): Promise<Competition> {
  if (!supabase) {
    const idx = mockCompetitions.findIndex((c) => c.id === id)
    if (idx < 0) throw new Error('Competencia no encontrada')
    mockCompetitions[idx] = { ...mockCompetitions[idx], ...input }
    return simulate(mockCompetitions[idx])
  }

  const { data, error } = await supabase
    .from('competitions')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Competition
}