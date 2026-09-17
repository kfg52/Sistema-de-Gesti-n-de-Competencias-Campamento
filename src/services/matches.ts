import { supabase } from '@/lib/supabase'
import { mockMatches, mockParticipants, mockTeams } from '@/lib/mockDb'
import type { Match, MatchStatus, MatchWithDetails } from '@/types'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

/** Enfrentamientos de una competencia con equipos/participantes y ganador. */
export async function getMatchesByCompetition(
  competitionId: string,
): Promise<MatchWithDetails[]> {
  if (!supabase) {
    const rows = mockMatches
      .filter((m) => m.competition_id === competitionId)
      .map((m) => ({
        ...m,
        team_a: m.team_a_id ? mockTeams.find((t) => t.id === m.team_a_id) ?? null : null,
        team_b: m.team_b_id ? mockTeams.find((t) => t.id === m.team_b_id) ?? null : null,
        participant_a: m.participant_a_id
          ? mockParticipants.find((p) => p.id === m.participant_a_id) ?? null
          : null,
        participant_b: m.participant_b_id
          ? mockParticipants.find((p) => p.id === m.participant_b_id) ?? null
          : null,
        winner_team: m.winner_team_id
          ? mockTeams.find((t) => t.id === m.winner_team_id) ?? null
          : null,
        winner_participant: m.winner_participant_id
          ? mockParticipants.find((p) => p.id === m.winner_participant_id) ?? null
          : null,
      }))
    return simulate(rows)
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      `*,
       team_a:teams!matches_team_a_id_fkey(*),
       team_b:teams!matches_team_b_id_fkey(*),
       participant_a:participants!matches_participant_a_id_fkey(*),
       participant_b:participants!matches_participant_b_id_fkey(*),
       winner_team:teams!matches_winner_team_id_fkey(*),
       winner_participant:participants!matches_winner_participant_id_fkey(*)`,
    )
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as MatchWithDetails[]
}

export async function getMatchById(id: string): Promise<Match | null> {
  if (!supabase) return simulate(mockMatches.find((m) => m.id === id) ?? null)

  const { data, error } = await supabase.from('matches').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Match) ?? null
}

export interface CreateMatchInput {
  competition_id: string
  round_id: string | null
  team_a_id?: string | null
  team_b_id?: string | null
  participant_a_id?: string | null
  participant_b_id?: string | null
  next_match_id?: string | null
  status?: MatchStatus
}

function validateSides(input: CreateMatchInput) {
  const teamCount = [input.team_a_id, input.team_b_id].filter(Boolean).length
  const participantCount = [input.participant_a_id, input.participant_b_id].filter(Boolean).length
  if (teamCount > 0 && participantCount > 0) {
    throw new Error('Un partido usa equipos O participantes, no ambos')
  }
  if (input.team_a_id === input.team_b_id && input.team_a_id) {
    throw new Error('Un equipo no puede jugar contra sí mismo')
  }
  if (input.participant_a_id === input.participant_b_id && input.participant_a_id) {
    throw new Error('Un participante no puede jugar contra sí mismo')
  }
}

/** Crea un enfrentamiento (solo admin). */
export async function createMatch(input: CreateMatchInput): Promise<Match> {
  validateSides(input)

  if (!supabase) {
    const match: Match = {
      id: `m-demo-${Date.now()}`,
      competition_id: input.competition_id,
      round_id: input.round_id,
      team_a_id: input.team_a_id ?? null,
      team_b_id: input.team_b_id ?? null,
      participant_a_id: input.participant_a_id ?? null,
      participant_b_id: input.participant_b_id ?? null,
      score_a: null,
      score_b: null,
      winner_participant_id: null,
      winner_team_id: null,
      status: input.status ?? 'SCHEDULED',
      next_match_id: input.next_match_id ?? null,
      created_at: new Date().toISOString(),
      completed_at: null,
    }
    mockMatches.push(match)
    return simulate(match)
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({
      competition_id: input.competition_id,
      round_id: input.round_id,
      team_a_id: input.team_a_id ?? null,
      team_b_id: input.team_b_id ?? null,
      participant_a_id: input.participant_a_id ?? null,
      participant_b_id: input.participant_b_id ?? null,
      next_match_id: input.next_match_id ?? null,
      status: input.status ?? 'SCHEDULED',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Match
}

/** Elimina un enfrentamiento (solo admin). */
export async function deleteMatch(matchId: string): Promise<void> {
  if (!supabase) {
    const idx = mockMatches.findIndex((m) => m.id === matchId)
    if (idx >= 0) mockMatches.splice(idx, 1)
    return simulate(undefined)
  }

  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  if (error) throw error
}

export interface RecordResultInput {
  score_a: number
  score_b: number
}

/**
 * Registra el marcador de un partido y lo cierra como COMPLETED.
 * - Deriva el ganador automáticamente (no se permiten empates en eliminatoria directa).
 * - Si el partido tiene next_match_id, el ganador avanza rellenando el lado libre.
 */
export async function recordMatchResult(
  matchId: string,
  { score_a, score_b }: RecordResultInput,
): Promise<Match> {
  if (score_a < 0 || score_b < 0) throw new Error('Los marcadores no pueden ser negativos')
  if (score_a === score_b) throw new Error('No se permiten empates en eliminatoria directa')

  const winnerIsA = score_a > score_b

  if (!supabase) {
    const idx = mockMatches.findIndex((m) => m.id === matchId)
    if (idx < 0) throw new Error('Partido no encontrado')
    const current = mockMatches[idx]
    const winner_team_id = current.team_a_id != null ? (winnerIsA ? current.team_a_id : current.team_b_id) : null
    const winner_participant_id =
      current.participant_a_id != null ? (winnerIsA ? current.participant_a_id : current.participant_b_id) : null
    const updated: Match = {
      ...current,
      score_a,
      score_b,
      winner_team_id,
      winner_participant_id,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    }
    mockMatches[idx] = updated

    if (current.next_match_id) {
      advanceWinnerDemo(current.next_match_id, winner_team_id, winner_participant_id)
    }
    return simulate(updated)
  }

  const { data: current } = await supabase.from('matches').select('*').eq('id', matchId).maybeSingle()
  if (!current) throw new Error('Partido no encontrado')
  const m = current as Match

  const winner_team_id = m.team_a_id != null ? (winnerIsA ? m.team_a_id : m.team_b_id) : null
  const winner_participant_id =
    m.participant_a_id != null ? (winnerIsA ? m.participant_a_id : m.participant_b_id) : null

  const { data: saved, error } = await supabase
    .from('matches')
    .update({
      score_a,
      score_b,
      winner_team_id,
      winner_participant_id,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select('*')
    .single()

  if (error) throw error

  if (m.next_match_id) {
    await advanceWinner(m.next_match_id, winner_team_id, winner_participant_id)
  }

  return saved as Match
}

async function advanceWinner(
  nextMatchId: string,
  winnerTeamId: string | null,
  winnerParticipantId: string | null,
): Promise<void> {
  if (!supabase) return
  const { data: nextRow } = await supabase
    .from('matches')
    .select('*')
    .eq('id', nextMatchId)
    .maybeSingle()
  if (!nextRow) return
  const next = nextRow as Match

  const patch: Partial<Match> = {}
  if (winnerTeamId) {
    if (next.team_a_id == null) patch.team_a_id = winnerTeamId
    else if (next.team_b_id == null) patch.team_b_id = winnerTeamId
  } else if (winnerParticipantId) {
    if (next.participant_a_id == null) patch.participant_a_id = winnerParticipantId
    else if (next.participant_b_id == null) patch.participant_b_id = winnerParticipantId
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from('matches').update(patch).eq('id', nextMatchId)
  }
}

function advanceWinnerDemo(
  nextMatchId: string,
  winnerTeamId: string | null,
  winnerParticipantId: string | null,
): void {
  const idx = mockMatches.findIndex((m) => m.id === nextMatchId)
  if (idx < 0) return
  const next = mockMatches[idx]
  if (winnerTeamId) {
    if (next.team_a_id == null) next.team_a_id = winnerTeamId
    else if (next.team_b_id == null) next.team_b_id = winnerTeamId
  } else if (winnerParticipantId) {
    if (next.participant_a_id == null) next.participant_a_id = winnerParticipantId
    else if (next.participant_b_id == null) next.participant_b_id = winnerParticipantId
  }
  mockMatches[idx] = next
}