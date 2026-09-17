import { supabase } from '@/lib/supabase'
import {
  mockMatches,
  mockParticipants,
  mockRounds,
  mockRegistrations,
  mockTeams,
} from '@/lib/mockDb'
import type { Round, RoundStatus, Team } from '@/types'

const DEMO_DELAY = 200

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

export async function getRoundsByCompetition(competitionId: string): Promise<Round[]> {
  if (!supabase) {
    return simulate(
      mockRounds.filter((r) => r.competition_id === competitionId).sort((a, b) => a.round_number - b.round_number),
    )
  }

  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: true })

  if (error) throw error
  return data as Round[]
}

export async function createRound(
  competitionId: string,
  name: string,
  roundNumber: number,
): Promise<Round> {
  const trimmedName = name.trim() || `Ronda ${roundNumber}`

  if (!supabase) {
    const existing = mockRounds.some(
      (r) => r.competition_id === competitionId && r.round_number === roundNumber,
    )
    if (existing) throw new Error('Ya existe una ronda con ese número')
    const round: Round = {
      id: `r-demo-${Date.now()}`,
      competition_id: competitionId,
      name: trimmedName,
      round_number: roundNumber,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }
    mockRounds.push(round)
    return simulate(round)
  }

  const { data, error } = await supabase
    .from('rounds')
    .insert({ competition_id: competitionId, name: trimmedName, round_number: roundNumber })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una ronda con ese número')
    throw error
  }
  return data as Round
}

export async function updateRoundStatus(roundId: string, status: RoundStatus): Promise<Round> {
  if (!supabase) {
    const idx = mockRounds.findIndex((r) => r.id === roundId)
    if (idx < 0) throw new Error('Ronda no encontrada')
    mockRounds[idx] = { ...mockRounds[idx], status }
    return simulate(mockRounds[idx])
  }

  const { data, error } = await supabase
    .from('rounds')
    .update({ status })
    .eq('id', roundId)
    .select('*')
    .single()

  if (error) throw error
  return data as Round
}

/** Elimina una ronda (los partidos se eliminan en cascada). Solo admin. */
export async function deleteRound(roundId: string): Promise<void> {
  if (!supabase) {
    const idx = mockRounds.findIndex((r) => r.id === roundId)
    if (idx >= 0) mockRounds.splice(idx, 1)
    return simulate(undefined)
  }

  const { error } = await supabase.from('rounds').delete().eq('id', roundId)
  if (error) throw error
}

export interface GenerationResult {
  created: number
  leftover: number
}

/**
 * Genera los enfrentamientos de una ronda pareando a los participantes:
 * - Ronda 1: todos los equipos/inscritos de la competencia.
 * - Rondas siguientes: los ganadores de la ronda anterior.
 * Quedan sin pareja (leftover) los sobrantes cuando el grupo es impar.
 */
export async function generateRoundMatches(
  competitionId: string,
  roundId: string,
  roundNumber: number,
): Promise<GenerationResult> {
  const isFirstRound = roundNumber <= 1

  if (!supabase) {
    const hasTeams = mockTeams.some((t) => t.competition_id === competitionId)
    return simulateDemoGeneration(competitionId, roundId, roundNumber, hasTeams)
  }

  const { data: compRow } = await supabase
    .from('competitions')
    .select('tipo')
    .eq('id', competitionId)
    .maybeSingle()
  if (!compRow) throw new Error('Competencia no encontrada')
  const isTeam = (compRow as { tipo: string }).tipo === 'TEAM'

  let pool: Array<{ id: string }> = []
  if (isFirstRound) {
    if (isTeam) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('competition_id', competitionId)
      pool = ((teams ?? []) as Team[]).map((t) => ({ id: t.id }))
    } else {
      const { data: regs } = await supabase
        .from('registrations')
        .select('participant_id')
        .eq('competition_id', competitionId)
      pool = (regs ?? []).map((r) => ({
        id: (r as { participant_id: string }).participant_id,
      }))
    }
  } else {
    const { data: prevRound } = await supabase
      .from('rounds')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('round_number', roundNumber - 1)
      .maybeSingle()
    if (!prevRound) {
      const prev = isTeam
        ? ((await supabase.from('teams').select('id').eq('competition_id', competitionId)).data ??
          []) as Team[]
        : ((await supabase
            .from('registrations')
            .select('participant_id')
            .eq('competition_id', competitionId)).data ?? []).map((r) => ({
            id: (r as { participant_id: string }).participant_id,
          }))
      pool = isTeam ? prev.map((t) => ({ id: t.id })) : prev
    } else {
      const { data: prevMatches } = await supabase
        .from('matches')
        .select('winner_team_id, winner_participant_id')
        .eq('round_id', prevRound.id)
        .not('status', 'eq', 'CANCELLED')
      const winners = new Set<string>()
      for (const m of prevMatches ?? []) {
        const row = m as {
          winner_team_id: string | null
          winner_participant_id: string | null
        }
        if (row.winner_team_id) winners.add(row.winner_team_id)
        if (row.winner_participant_id) winners.add(row.winner_participant_id)
      }
      pool = [...winners].map((id) => ({ id }))
    }
  }

  const { data: currentMatches } = await supabase
    .from('matches')
    .select('team_a_id, team_b_id, participant_a_id, participant_b_id')
    .eq('round_id', roundId)
  const excluded = new Set<string>()
  for (const m of currentMatches ?? []) {
    const row = m as {
      team_a_id: string | null
      team_b_id: string | null
      participant_a_id: string | null
      participant_b_id: string | null
    }
    if (row.team_a_id) excluded.add(row.team_a_id)
    if (row.team_b_id) excluded.add(row.team_b_id)
    if (row.participant_a_id) excluded.add(row.participant_a_id)
    if (row.participant_b_id) excluded.add(row.participant_b_id)
  }

  const seen = new Set<string>()
  const available = pool.filter((p) => {
    if (excluded.has(p.id) || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const pairs = chunkPairs(available)
  for (const [a, b] of pairs) {
    const payload = isTeam
      ? { team_a_id: a.id, team_b_id: b.id }
      : { participant_a_id: a.id, participant_b_id: b.id }
    const { error: insError } = await supabase.from('matches').insert({
      competition_id: competitionId,
      round_id: roundId,
      status: 'SCHEDULED',
      ...payload,
    })
    if (insError) throw insError
  }

  return { created: pairs.length, leftover: available.length % 2 }
}

function chunkPairs<T>(items: T[]): Array<[T, T]> {
  const pairs: Array<[T, T]> = []
  for (let i = 0; i + 1 < items.length; i += 2) pairs.push([items[i], items[i + 1]])
  return pairs
}

function simulateDemoGeneration(
  competitionId: string,
  roundId: string,
  roundNumber: number,
  hasTeams: boolean,
): GenerationResult {
  const isFirstRound = roundNumber <= 1

  let pool: Array<{ id: string }> = []
  if (isFirstRound) {
    pool = hasTeams
      ? mockTeams.filter((t) => t.competition_id === competitionId)
      : mockParticipants.filter((p) =>
          mockRegistrations.some(
            (r) => r.competition_id === competitionId && r.participant_id === p.id,
          ),
        )
  } else {
    const prevRound = mockRounds.find(
      (r) => r.competition_id === competitionId && r.round_number === roundNumber - 1,
    )
    const prevMatches = prevRound
      ? mockMatches.filter((m) => m.round_id === prevRound.id)
      : []
    const winners = new Set<string>()
    for (const m of prevMatches) {
      if (m.winner_team_id) winners.add(m.winner_team_id)
      if (m.winner_participant_id) winners.add(m.winner_participant_id)
    }
    pool = hasTeams
      ? mockTeams.filter((t) => winners.has(t.id))
      : mockParticipants.filter((p) => winners.has(p.id))
  }

  const excluded = new Set<string>()
  for (const m of mockMatches.filter((m) => m.round_id === roundId)) {
    if (m.team_a_id) excluded.add(m.team_a_id)
    if (m.team_b_id) excluded.add(m.team_b_id)
    if (m.participant_a_id) excluded.add(m.participant_a_id)
    if (m.participant_b_id) excluded.add(m.participant_b_id)
  }

  const seen = new Set<string>()
  const available = pool.filter((p) => {
    if (excluded.has(p.id) || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const pairs = chunkPairs(available)
  for (const [a, b] of pairs) {
    mockMatches.push({
      id: `m-demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      competition_id: competitionId,
      round_id: roundId,
      team_a_id: hasTeams ? a.id : null,
      team_b_id: hasTeams ? b.id : null,
      participant_a_id: hasTeams ? null : a.id,
      participant_b_id: hasTeams ? null : b.id,
      score_a: null,
      score_b: null,
      winner_participant_id: null,
      winner_team_id: null,
      status: 'SCHEDULED',
      next_match_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    })
  }
  return { created: pairs.length, leftover: available.length % 2 }
}