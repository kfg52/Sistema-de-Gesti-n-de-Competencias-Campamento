import { supabase } from '@/lib/supabase'
import {
  mockChurches,
  mockCompetitions,
  mockMatches,
  mockParticipants,
  mockRankingPoints,
  mockRounds,
  mockTeamMembers,
  mockTeams,
} from '@/lib/mockDb'
import type {
  Classification,
  ChurchStanding,
  CompetitionPodium,
  Match,
  RankingPoints,
} from '@/types'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

export async function getRankingPoints(): Promise<RankingPoints | null> {
  if (!supabase) return simulate(mockRankingPoints)

  const { data, error } = await supabase.from('ranking_points').select('*').limit(1).maybeSingle()
  if (error) throw error
  return (data as RankingPoints) ?? null
}

export async function updateRankingPoints(
  points: Omit<RankingPoints, 'id' | 'updated_at'>,
): Promise<RankingPoints> {
  if (!supabase) {
    Object.assign(mockRankingPoints, points)
    mockRankingPoints.updated_at = new Date().toISOString()
    return simulate(mockRankingPoints)
  }

  const { data: current } = await supabase.from('ranking_points').select('id').limit(1).maybeSingle()
  if (!current) {
    const { data: created, error: insError } = await supabase
      .from('ranking_points')
      .insert(points)
      .select('*')
      .single()
    if (insError) throw insError
    return created as RankingPoints
  }

  const { data, error } = await supabase
    .from('ranking_points')
    .update(points)
    .eq('id', (current as { id: string }).id)
    .select('*')
    .single()

  if (error) throw error
  return data as RankingPoints
}

interface ClassificationInput {
  churches: Array<{ id: string; name: string }>
  competitions: Array<{ id: string; name: string; tipo: string }>
  rounds: Array<{ id: string; competition_id: string; round_number: number }>
  matches: Match[]
  teams: Array<{ id: string; competition_id: string }>
  teamMemberChurches: Map<string, Set<string>>
  participantChurch: Map<string, string>
  participantNames: Map<string, string>
  teamNames: Map<string, string>
  config: RankingPoints
}

interface Entity {
  kind: 'team' | 'participant'
  id: string
}

function matchSideEntity(m: Match, side: 'a' | 'b'): Entity | null {
  if (side === 'a') {
    if (m.team_a_id) return { kind: 'team', id: m.team_a_id }
    if (m.participant_a_id) return { kind: 'participant', id: m.participant_a_id }
  } else {
    if (m.team_b_id) return { kind: 'team', id: m.team_b_id }
    if (m.participant_b_id) return { kind: 'participant', id: m.participant_b_id }
  }
  return null
}

function loserOf(m: Match): Entity | null {
  if (m.status !== 'COMPLETED') return null
  const a = matchSideEntity(m, 'a')
  const b = matchSideEntity(m, 'b')
  if (m.team_a_id && m.winner_team_id) return m.winner_team_id === m.team_a_id ? b : a
  if (m.participant_a_id && m.winner_participant_id) {
    return m.winner_participant_id === m.participant_a_id ? b : a
  }
  return null
}

function winnerOf(m: Match): Entity | null {
  if (m.status !== 'COMPLETED') return null
  if (m.team_a_id && m.winner_team_id) {
    return { kind: 'team', id: m.winner_team_id }
  }
  if (m.participant_a_id && m.winner_participant_id) {
    return { kind: 'participant', id: m.winner_participant_id }
  }
  return null
}

function entityChurches(entity: Entity, input: ClassificationInput): Set<string> {
  if (entity.kind === 'team') {
    return input.teamMemberChurches.get(entity.id) ?? new Set()
  }
  const churchId = input.participantChurch.get(entity.id)
  return churchId ? new Set([churchId]) : new Set()
}

function entityName(entity: Entity, input: ClassificationInput): string {
  if (entity.kind === 'team') return input.teamNames.get(entity.id) ?? 'Equipo'
  return input.participantNames.get(entity.id) ?? 'Participante'
}

function entityKey(entity: Entity): string {
  return `${entity.kind}:${entity.id}`
}

/**
 * Calcula la clasificación por iglesia a partir de los resultados registrados.
 * Reglas:
 * - Participación: puntos a todo inscrito con al menos un partido no cancelado.
 * - Victoria: puntos por cada partido ganado.
 * - Podio: ganador y perdedor de la gran final (ronda final con un solo partido);
 *   si la ronda previa tiene exactamente 2 partidos completados, ambos perdedores
 *   reciben puntos de 3.er lugar.
 * - Equipos: cada iglesia representada en el plantel recibe los puntos.
 */
export function computeClassification(input: ClassificationInput): Classification {
  const config = input.config
  const points: Record<string, number> = {}
  const victories: Record<string, number> = {}
  const participations: Record<string, number> = {}
  const medalComps: Record<string, { gold: Set<string>; silver: Set<string>; bronze: Set<string> }> = {}
  const podiumBonus: Map<string, 'first' | 'second' | 'third'> = new Map()
  const podiums: CompetitionPodium[] = []
  const victoryMarked = new Set<string>()
  const participationMarked = new Set<string>()

  // Acredita a cada iglesia representada: participación + victorias + podio del entity.
  const creditEntity = (
    compId: string,
    entity: Entity,
    participate: boolean,
    wins: number,
  ) => {
    const churches = entityChurches(entity, input)
    if (churches.size === 0) return
    const pts = (participate ? config.participation : 0) + wins * config.victory
    const bonus =
      podiumBonus.get(entityKey(entity)) === 'first'
        ? config.first_place
        : podiumBonus.get(entityKey(entity)) === 'second'
          ? config.second_place
          : podiumBonus.get(entityKey(entity)) === 'third'
            ? config.third_place
            : 0
    const total = pts + bonus
    for (const churchId of churches) {
      points[churchId] = (points[churchId] ?? 0) + total
      if (wins > 0 && !victoryMarked.has(`${compId}:${churchId}`)) {
        victories[churchId] = (victories[churchId] ?? 0) + 1
        victoryMarked.add(`${compId}:${churchId}`)
      }
      if (participate) {
        const key = `${compId}:${churchId}:${entityKey(entity)}`
        if (!participationMarked.has(key)) {
          participations[churchId] = (participations[churchId] ?? 0) + 1
          participationMarked.add(key)
        }
      }
    }
  }

  for (const comp of input.competitions) {
    const compRounds = input.rounds
      .filter((r) => r.competition_id === comp.id)
      .sort((a, b) => a.round_number - b.round_number)
    const compMatches = input.matches.filter((m) => m.competition_id === comp.id)

    // Participación: entidades con al menos un partido no cancelado.
    const participated = new Set<string>()
    for (const m of compMatches) {
      if (m.status === 'CANCELLED') continue
      for (const side of ['a', 'b'] as const) {
        const e = matchSideEntity(m, side)
        if (e) participated.add(entityKey(e))
      }
    }

    // Victorias por partido completado (por entidad).
    const winCount = new Map<string, number>()
    for (const m of compMatches) {
      if (m.status !== 'COMPLETED') continue
      const w = winnerOf(m)
      if (w) {
        winCount.set(entityKey(w), (winCount.get(entityKey(w)) ?? 0) + 1)
      }
    }

    // Podium: final + perdedores de la ronda previa.
    let champion: Entity | null = null
    let runnerUp: Entity | null = null
    let thirdPlaces: Entity[] = []
    const lastRound = compRounds[compRounds.length - 1]
    if (lastRound && compMatches.filter((m) => m.round_id === lastRound.id).length === 1) {
      const finalMatch = compMatches.find((m) => m.round_id === lastRound.id)
      if (finalMatch && finalMatch.status === 'COMPLETED') {
        champion = winnerOf(finalMatch)
        runnerUp = loserOf(finalMatch)

        const prevRound = compRounds.find(
          (r) => r.round_number === lastRound.round_number - 1,
        )
        if (prevRound) {
          const prevMatches = compMatches.filter((m) => m.round_id === prevRound.id)
          if (
            prevMatches.length === 2 &&
            prevMatches.every((m) => m.status === 'COMPLETED')
          ) {
            thirdPlaces = prevMatches
              .map((m) => loserOf(m))
              .filter((e): e is Entity => e !== null)
          }
        }
      }
    }

    if (champion) {
      if (champion) podiumBonus.set(entityKey(champion), 'first')
      if (runnerUp) podiumBonus.set(entityKey(runnerUp), 'second')
      for (const t of thirdPlaces) podiumBonus.set(entityKey(t), 'third')

      // Medallas por iglesia (una por competencia).
      for (const churchId of entityChurches(champion, input)) {
        medalComps[churchId] = medalComps[churchId] ?? { gold: new Set(), silver: new Set(), bronze: new Set() }
        medalComps[churchId].gold.add(comp.id)
      }
      if (runnerUp) {
        for (const churchId of entityChurches(runnerUp, input)) {
          medalComps[churchId] = medalComps[churchId] ?? { gold: new Set(), silver: new Set(), bronze: new Set() }
          medalComps[churchId].silver.add(comp.id)
        }
      }
      for (const t of thirdPlaces) {
        for (const churchId of entityChurches(t, input)) {
          medalComps[churchId] = medalComps[churchId] ?? { gold: new Set(), silver: new Set(), bronze: new Set() }
          medalComps[churchId].bronze.add(comp.id)
        }
      }

      podiums.push({
        competition_id: comp.id,
        competition_name: comp.name,
        champion: entityName(champion, input),
        runner_up: runnerUp ? entityName(runnerUp, input) : null,
        third: thirdPlaces.map((e) => entityName(e, input)),
      })
    } else {
      podiums.push({
        competition_id: comp.id,
        competition_name: comp.name,
        champion: null,
        runner_up: null,
        third: [],
      })
    }

    // Acreditación final por entidad participante: participación + victorias + podio.
    for (const key of participated) {
      creditEntity(comp.id, entityByKey(key), true, winCount.get(key) ?? 0)
    }
  }

  const churchById = new Map(input.churches.map((c) => [c.id, c.name]))
  const standings: ChurchStanding[] = [...new Set([...Object.keys(points)])]
    .map((id) => {
      const mc = medalComps[id] ?? { gold: new Set(), silver: new Set(), bronze: new Set() }
      return {
        church_id: id,
        church_name: churchById.get(id) ?? 'Iglesia',
        total_points: points[id] ?? 0,
        gold: mc.gold.size,
        silver: mc.silver.size,
        bronze: mc.bronze.size,
        victories: victories[id] ?? 0,
        participations: participations[id] ?? 0,
      }
    })
    .sort(
      (a, b) =>
        b.total_points - a.total_points ||
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        a.church_name.localeCompare(b.church_name),
    )

  return { config, standings, podiums }
}

function entityByKey(key: string): Entity {
  return key.startsWith('team:')
    ? { kind: 'team', id: key.slice(5) }
    : { kind: 'participant', id: key.slice(12) }
}

export async function getClassification(): Promise<Classification> {
  if (!supabase) {
    const participantChurch = new Map<string, string>()
    const participantNames = new Map<string, string>()
    for (const p of mockParticipants) {
      participantChurch.set(p.id, p.church_id)
      participantNames.set(p.id, `${p.first_name} ${p.last_name}`)
    }
    const teamMemberChurches = new Map<string, Set<string>>()
    for (const tm of mockTeamMembers) {
      const churchId = participantChurch.get(tm.participant_id)
      if (!churchId) continue
      const set = teamMemberChurches.get(tm.team_id) ?? new Set<string>()
      set.add(churchId)
      teamMemberChurches.set(tm.team_id, set)
    }
    const teamNames = new Map(mockTeams.map((t) => [t.id, t.name]))
    const result = computeClassification({
      churches: mockChurches.map((c) => ({ id: c.id, name: c.name })),
      competitions: mockCompetitions.map((c) => ({ id: c.id, name: c.name, tipo: c.tipo })),
      rounds: mockRounds,
      matches: mockMatches,
      teams: mockTeams.map((t) => ({ id: t.id, competition_id: t.competition_id })),
      teamMemberChurches,
      participantChurch,
      participantNames,
      teamNames,
      config: mockRankingPoints,
    })
    return simulate(result)
  }

  const [churches, competitions, rounds, matches, participants, teams, teamMembers, config] =
    await Promise.all([
      supabase.from('churches').select('id, name'),
      supabase.from('competitions').select('id, name, tipo'),
      supabase.from('rounds').select('id, competition_id, round_number'),
      supabase.from('matches').select('*'),
      supabase.from('participants').select('id, first_name, last_name, church_id'),
      supabase.from('teams').select('id, competition_id, name'),
      supabase.from('team_members').select('team_id, participant:participants(church_id)'),
      supabase.from('ranking_points').select('*').limit(1).maybeSingle(),
    ])

  if (config.error || !config.data) {
    throw config.error ?? new Error('No hay configuración de puntos registrada.')
  }

  const participantChurch = new Map<string, string>()
  const participantNames = new Map<string, string>()
  for (const p of (participants.data ?? []) as Array<{ id: string; first_name: string; last_name: string; church_id: string }>) {
    participantChurch.set(p.id, p.church_id)
    participantNames.set(p.id, `${p.first_name} ${p.last_name}`)
  }
  const teamMemberChurches = new Map<string, Set<string>>()
  for (const tm of (teamMembers.data ?? []) as Array<{
    team_id: string
    participant: Array<{ church_id: string }> | { church_id: string } | null
  }>) {
    const p = Array.isArray(tm.participant) ? tm.participant[0] : tm.participant
    if (!p) continue
    const set = teamMemberChurches.get(tm.team_id) ?? new Set<string>()
    set.add(p.church_id)
    teamMemberChurches.set(tm.team_id, set)
  }
  const teamNames = new Map((teams.data ?? []).map((t) => [(t as { id: string }).id, (t as { name: string }).name]))

  const result = computeClassification({
    churches: (churches.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    competitions: (competitions.data ?? []).map((c) => ({ id: c.id, name: c.name, tipo: c.tipo })),
    rounds: (rounds.data ?? []).map((r) => ({ id: r.id, competition_id: r.competition_id, round_number: r.round_number })),
    matches: matches.data as Match[],
    teams: (teams.data ?? []).map((t) => ({ id: t.id, competition_id: t.competition_id })),
    teamMemberChurches,
    participantChurch,
    participantNames,
    teamNames,
    config: config.data as RankingPoints,
  })
  return result
}