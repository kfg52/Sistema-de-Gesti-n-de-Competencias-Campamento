import { supabase } from '@/lib/supabase'
import {
  mockChurches,
  mockRegistrations,
  nextLocalParticipantCode,
  localRefreshToken,
  participantsBuffer,
  registrationsBuffer,
  teamMembersBuffer,
} from '@/lib/mockDb'
import type { Participant, ParticipantWithChurch } from '@/types'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

export interface CreateParticipantInput {
  first_name: string
  last_name: string
  church_id: string
}

export async function createParticipant(
  input: CreateParticipantInput,
): Promise<Participant> {
  if (!supabase) {
    const participant: Participant = {
      id: `p-demo-${participantsBuffer.length + 1}`,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      church_id: input.church_id,
      participant_code: nextLocalParticipantCode(),
      participant_token: localRefreshToken(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    participantsBuffer.push(participant)
    return simulate(participant)
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      church_id: input.church_id,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Participant
}

export async function getParticipantByToken(token: string): Promise<ParticipantWithChurch | null> {
  if (!supabase) {
    const p = participantsBuffer.find((x) => x.participant_token === token) ?? null
    if (!p) return simulate(null)
    const church = mockChurches.find((c) => c.id === p.church_id)
    return simulate({ ...p, church: church ? { id: church.id, name: church.name } : undefined })
  }

  const { data, error } = await supabase
    .from('participants')
    .select('*, church:churches(id, name)')
    .eq('participant_token', token)
    .maybeSingle()

  if (error) throw error
  return data as ParticipantWithChurch | null
}

export async function getParticipantByCode(code: string): Promise<ParticipantWithChurch | null> {
  if (!supabase) {
    const p = participantsBuffer.find((x) => x.participant_code.toLowerCase() === code.toLowerCase()) ?? null
    if (!p) return simulate(null)
    const church = mockChurches.find((c) => c.id === p.church_id)
    return simulate({ ...p, church: church ? { id: church.id, name: church.name } : undefined })
  }

  const { data, error } = await supabase
    .from('participants')
    .select('*, church:churches(id, name)')
    .ilike('participant_code', code)
    .maybeSingle()

  if (error) throw error
  return data as ParticipantWithChurch | null
}

export interface ParticipantFilters {
  search?: string
  churchId?: string
  competitionId?: string
}

/** Búsqueda de participantes (nombre, apellido, iglesia, competencia). */
export async function searchParticipants(
  filters: ParticipantFilters = {},
): Promise<ParticipantWithChurch[]> {
  if (!supabase) {
    let rows = participantsBuffer.slice()
    const churchById = new Map(mockChurches.map((c) => [c.id, c.name]))
    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q),
      )
    }
    if (filters.churchId) rows = rows.filter((p) => p.church_id === filters.churchId)
    if (filters.competitionId) {
      const allowed = new Set(
        mockRegistrations
          .filter((r) => r.competition_id === filters.competitionId)
          .map((r) => r.participant_id),
      )
      rows = rows.filter((p) => allowed.has(p.id))
    }
    const result = rows.map((p) => ({
      ...p,
      church: { id: p.church_id, name: churchById.get(p.church_id) ?? '' },
    }))
    return simulate(result)
  }

  let query = supabase.from('participants').select('*, church:churches(id, name)')

  if (filters.search) query = query.or(
    `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`,
  )
  if (filters.churchId) query = query.eq('church_id', filters.churchId)
  if (filters.competitionId) {
    // Solo participantes inscritos en la competencia indicada.
    const { data: regs } = await supabase
      .from('registrations')
      .select('participant_id')
      .eq('competition_id', filters.competitionId)
    const ids = (regs ?? []).map((r) => (r as { participant_id: string }).participant_id)
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }
  query = query.order('participant_code', { ascending: true }).limit(200)

  const { data, error } = await query
  if (error) throw error
  return data as ParticipantWithChurch[]
}

export async function getParticipantsCount(): Promise<number> {
  if (!supabase) return simulate(participantsBuffer.length)
  const { count, error } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Actualiza los datos de un participante (solo admin). */
export async function updateParticipant(
  id: string,
  input: CreateParticipantInput,
): Promise<Participant> {
  if (!supabase) {
    const idx = participantsBuffer.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Participante no encontrado')
    const updated: Participant = {
      ...participantsBuffer[idx],
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      church_id: input.church_id,
      updated_at: new Date().toISOString(),
    }
    participantsBuffer[idx] = updated
    return simulate(updated)
  }

  const { data, error } = await supabase
    .from('participants')
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      church_id: input.church_id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Participant
}

/** Elimina un participante (cascade: registrations y team_members). Solo admin. */
export async function deleteParticipant(id: string): Promise<void> {
  if (!supabase) {
    const idx = participantsBuffer.findIndex((p) => p.id === id)
    if (idx >= 0) participantsBuffer.splice(idx, 1)

    // Simular ON DELETE CASCADE en modo demo
    for (let i = registrationsBuffer.length - 1; i >= 0; i--) {
      if (registrationsBuffer[i].participant_id === id) {
        registrationsBuffer.splice(i, 1)
      }
    }
    for (let i = teamMembersBuffer.length - 1; i >= 0; i--) {
      if (teamMembersBuffer[i].participant_id === id) {
        teamMembersBuffer.splice(i, 1)
      }
    }
    return simulate(undefined)
  }

  const { error } = await supabase.from('participants').delete().eq('id', id)
  if (error) throw error
}