import { supabase } from '@/lib/supabase'
import {
  mockChurches,
  mockCompetitions,
  mockParticipants,
  mockRegistrations,
  mockTeams,
  teamMembersBuffer,
} from '@/lib/mockDb'
import type {
  ParticipantWithChurch,
  Team,
  TeamMember,
  TeamMemberWithParticipant,
  TeamStatus,
} from '@/types'
import { TeamFullError } from '@/services/errors'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

/** Equipos de una competencia con su número de integrantes. */
export async function getTeamsByCompetition(
  competitionId: string,
): Promise<Array<Team & { member_count: number }>> {
  if (!supabase) {
    const rows = mockTeams
      .filter((t) => t.competition_id === competitionId)
      .map((t) => ({
        ...t,
        member_count: teamMembersBuffer.filter((m) => m.team_id === t.id).length,
      }))
    return simulate(rows)
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(id)')
    .eq('competition_id', competitionId)
    .order('name')

  if (error) throw error
  return (data as Array<Team & { team_members: { id: string }[] }>).map((t) => ({
    id: t.id,
    competition_id: t.competition_id,
    name: t.name,
    max_players: t.max_players,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
    member_count: t.team_members.length,
  }))
}

export async function getTeamById(id: string): Promise<
  | (Team & { members: TeamMemberWithParticipant[] })
  | null
> {
  if (!supabase) {
    const team = mockTeams.find((t) => t.id === id) ?? null
    if (!team) return simulate(null)
    const members = teamMembersBuffer
      .filter((m) => m.team_id === id)
      .map((m) => ({
        ...m,
        participant: {
          ...mockParticipants.find((p) => p.id === m.participant_id)!,
        },
      }))
    return simulate({ ...team, members })
  }

  const { data: members, error } = await supabase
    .from('team_members')
    .select('*, participant:participants(*)')
    .eq('team_id', id)

  if (error) throw error

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (teamError) throw teamError
  if (!team) return null
  return {
    ...(team as Team),
    members: members as TeamMemberWithParticipant[],
  }
}

export async function getTeamsCount(): Promise<number> {
  if (!supabase) return simulate(mockTeams.length)
  const { count, error } = await supabase.from('teams').select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Equipos (con su competencia) a los que pertenece un participante. */
export async function getTeamsByParticipant(
  participantId: string,
): Promise<Array<Team & { competition_name?: string }>> {
  if (!supabase) {
    const rows = teamMembersBuffer
      .filter((m) => m.participant_id === participantId)
      .flatMap((m) => {
        const team = mockTeams.find((t) => t.id === m.team_id)
        if (!team) return []
        return [
          {
            ...team,
            competition_name: mockCompetitions.find((c) => c.id === team.competition_id)?.name,
          },
        ]
      })
    return simulate(rows)
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('team:teams(*)')
    .eq('participant_id', participantId)

  if (error) throw error
  const rows = (data ?? []) as Array<{ team?: unknown }>
  return rows
    .flatMap((r) => (Array.isArray(r.team) ? r.team : r.team ? [r.team] : []))
    .filter(
      (t): t is Team =>
        !!t &&
        typeof t === 'object' &&
        !Array.isArray(t) &&
        'id' in (t as Record<string, unknown>) &&
        'name' in (t as Record<string, unknown>),
    )
}

/** Agrega un integrante validando cupo, registro y duplicados. */
export async function addTeamMember(
  teamId: string,
  participantId: string,
): Promise<TeamMember> {
  if (!supabase) {
    const members = teamMembersBuffer.filter((m) => m.team_id === teamId)
    const team = mockTeams.find((t) => t.id === teamId)
    const competition_id = team?.competition_id ?? ''
    const already = mockRegistrations.some(
      (r) =>
        r.participant_id === participantId &&
        teamMembersBuffer.some(
          (m) =>
            m.team_id === teamId &&
            m.participant_id === participantId,
        ),
    )
    if (already) throw new Error('El participante ya pertenece a este equipo')
    if (members.length >= (team?.max_players ?? 0)) throw new TeamFullError(team?.name ?? '')
    const row: TeamMember = {
      id: `tm-demo-${Date.now()}`,
      team_id: teamId,
      participant_id: participantId,
      created_at: new Date().toISOString(),
    }
    teamMembersBuffer.push(row)
    void competition_id
    return simulate(row)
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, participant_id: participantId })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('El participante ya pertenece a este equipo')
    if (error.code === 'PGRST204') throw error
    if (error.message.includes('cupo máximo')) throw new TeamFullError(teamId)
    if (error.message.includes('ya pertenece a otro equipo')) {
      throw new Error('El participante ya está en otro equipo de esta competencia')
    }
    if (error.message.includes('no está inscrito')) {
      throw new Error('El participante debe estar inscrito en esta competencia primero')
    }
    throw error
  }
  return data as TeamMember
}

/** Crea un equipo en una competencia (solo admin). */
export async function createTeam(
  competitionId: string,
  name: string,
  maxPlayers: number,
): Promise<Team> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('El nombre del equipo es obligatorio')

  if (!supabase) {
    const team: Team = {
      id: `t-demo-${Date.now()}`,
      competition_id: competitionId,
      name: trimmed,
      max_players: maxPlayers,
      status: 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockTeams.push(team)
    return simulate(team)
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({ competition_id: competitionId, name: trimmed, max_players: maxPlayers, status: 'OPEN' })
    .select('*')
    .single()

  if (error) throw error
  return data as Team
}

export interface UpdateTeamInput {
  name?: string
  max_players?: number
  status?: TeamStatus
}

/** Actualiza nombre, cupo o estado de un equipo (solo admin). */
export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
  if (!supabase) {
    const idx = mockTeams.findIndex((t) => t.id === teamId)
    if (idx < 0) throw new Error('Equipo no encontrado')
    mockTeams[idx] = {
      ...mockTeams[idx],
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.max_players != null ? { max_players: input.max_players } : {}),
      ...(input.status ? { status: input.status } : {}),
      updated_at: new Date().toISOString(),
    }
    return simulate(mockTeams[idx])
  }

  const { data, error } = await supabase
    .from('teams')
    .update(input)
    .eq('id', teamId)
    .select('*')
    .single()

  if (error) throw error
  return data as Team
}

/** Elimina un equipo (cascade: sus integrantes y partidos). Solo admin. */
export async function deleteTeam(teamId: string): Promise<void> {
  if (!supabase) {
    const idx = mockTeams.findIndex((t) => t.id === teamId)
    if (idx >= 0) mockTeams.splice(idx, 1)
    for (let i = teamMembersBuffer.length - 1; i >= 0; i--) {
      if (teamMembersBuffer[i].team_id === teamId) teamMembersBuffer.splice(i, 1)
    }
    return simulate(undefined)
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) throw error
}

/** Quita a un integrante de su equipo (solo admin). */
export async function removeTeamMember(memberId: string): Promise<void> {
  if (!supabase) {
    const idx = teamMembersBuffer.findIndex((m) => m.id === memberId)
    if (idx >= 0) teamMembersBuffer.splice(idx, 1)
    return simulate(undefined)
  }

  const { error } = await supabase.from('team_members').delete().eq('id', memberId)
  if (error) throw error
}

/**
 * Participantes disponibles para agregar a un equipo:
 * inscritos en la competencia del equipo y aún sin equipo en esa competencia.
 */
export async function getAvailableParticipantsForTeam(
  teamId: string,
): Promise<ParticipantWithChurch[]> {
  if (!supabase) {
    const team = mockTeams.find((t) => t.id === teamId)
    const competitionId = team?.competition_id ?? ''
    const teamIdsInCompetition = mockTeams
      .filter((t) => t.competition_id === competitionId)
      .map((t) => t.id)
    const excluded = new Set(
      teamMembersBuffer.filter((m) => teamIdsInCompetition.includes(m.team_id)).map((m) => m.participant_id),
    )
    const available = mockRegistrations
      .filter((r) => r.competition_id === competitionId && !excluded.has(r.participant_id))
      .map((r) => r.participant_id)
    const churchById = new Map(mockChurches.map((c) => [c.id, c.name]))
    const rows = [...new Set(available)]
      .map((id) => {
        const p = mockParticipants.find((x) => x.id === id)
        if (!p) return null
        return { ...p, church: { id: p.church_id, name: churchById.get(p.church_id) ?? '' } }
      })
      .filter(Boolean) as ParticipantWithChurch[]
    return simulate(rows)
  }

  const { data: team } = await supabase.from('teams').select('competition_id').eq('id', teamId).maybeSingle()
  if (!team) throw new Error('Equipo no encontrado')
  const competitionId = (team as { competition_id: string }).competition_id

  const { data: teamsInComp } = await supabase
    .from('teams')
    .select('id')
    .eq('competition_id', competitionId)
  const teamIds = (teamsInComp ?? []).map((t) => (t as { id: string }).id) as string[]

  const { data: members } = await supabase
    .from('team_members')
    .select('participant_id')
    .in('team_id', teamIds)
  const excluded = new Set((members ?? []).map((m) => (m as { participant_id: string }).participant_id))

  const { data: registrations } = await supabase
    .from('registrations')
    .select('participant_id')
    .eq('competition_id', competitionId)
  const candidateIds = (registrations ?? [])
    .map((r) => (r as { participant_id: string }).participant_id)
    .filter((id) => !excluded.has(id))

  if (candidateIds.length === 0) return []

  const { data: participants, error } = await supabase
    .from('participants')
    .select('*, church:churches(id, name)')
    .in('id', candidateIds)
    .order('first_name')

  if (error) throw error
  return participants as ParticipantWithChurch[]
}