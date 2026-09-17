import { supabase } from '@/lib/supabase'
import {
  mockCompetitions,
  mockRegistrations,
  participantsBuffer,
  registrationsBuffer,
} from '@/lib/mockDb'
import {
  AlreadyCheckedInError,
  CompetitionFullError,
  DuplicateRegistrationError,
} from '@/services/errors'
import type {
  AccreditationSummary,
  Competition,
  Registration,
  RegistrationStatus,
  RegistrationWithDetails,
} from '@/types'

const DEMO_DELAY = 250

const simulate = <T>(result: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), DEMO_DELAY))

/**
 * Inscribe a un participante en varias competencias.
 * - Regla crítica 1: nunca puede haber 2 inscripciones en la misma competencia.
 * - Regla crítica 2: respeta el cupo máximo por disciplina (max_cupos).
 */
export async function registerCompetitions(
  participantId: string,
  competitionIds: string[],
): Promise<Registration[]> {
  const uniqueIds = [...new Set(competitionIds)]
  if (uniqueIds.length === 0) return []

  if (!supabase) {
    // 1) Duplicados demo
    const existing = registrationsBuffer.filter(
      (r) => r.participant_id === participantId && uniqueIds.includes(r.competition_id),
    )
    if (existing.length > 0) {
      const names = existing
        .map((r) => mockCompetitions.find((c) => c.id === r.competition_id)?.name ?? '')
        .filter(Boolean)
      throw new DuplicateRegistrationError(names)
    }

    // 2) Cupos demo
    for (const cId of uniqueIds) {
      const comp = mockCompetitions.find((c) => c.id === cId)
      if (comp && comp.max_cupos) {
        const activeCount = registrationsBuffer.filter(
          (r) => r.competition_id === cId && r.status !== 'CANCELLED',
        ).length
        if (activeCount >= comp.max_cupos) {
          throw new CompetitionFullError(comp.name)
        }
      }
    }

    const created = uniqueIds.map((competitionId): Registration => {
      const row: Registration = {
        id: `reg-demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        participant_id: participantId,
        competition_id: competitionId,
        status: 'REGISTERED',
        created_at: new Date().toISOString(),
      }
      registrationsBuffer.push(row)
      return row
    })
    return simulate(created)
  }

  // 1) Validación previa de duplicados
  const { data: existingRows } = await supabase
    .from('registrations')
    .select('competition_id, competition:competitions(name)')
    .eq('participant_id', participantId)
    .in('competition_id', uniqueIds)

  if (existingRows && existingRows.length > 0) {
    const names = existingRows
      .map((r) => (r.competition as unknown as Competition).name)
      .filter(Boolean)
    throw new DuplicateRegistrationError(names)
  }

  // 2) Validación previa de cupos máximos
  const { data: compRows } = await supabase
    .from('competitions')
    .select('id, name, max_cupos')
    .in('id', uniqueIds)

  if (compRows && compRows.some((c) => c.max_cupos !== null)) {
    const { data: currentRegs } = await supabase
      .from('registrations')
      .select('competition_id')
      .in('competition_id', uniqueIds)
      .neq('status', 'CANCELLED')

    const countMap = new Map<string, number>()
    for (const r of currentRegs ?? []) {
      countMap.set(r.competition_id, (countMap.get(r.competition_id) ?? 0) + 1)
    }
    for (const c of compRows) {
      if (c.max_cupos !== null && (countMap.get(c.id) ?? 0) >= c.max_cupos) {
        throw new CompetitionFullError(c.name)
      }
    }
  }

  // 3) Inserción múltiple
  const rows = uniqueIds.map((competitionId) => ({
    participant_id: participantId,
    competition_id: competitionId,
  }))
  const { data, error } = await supabase.from('registrations').insert(rows).select('*')
  if (error) {
    if (error.code === '23505') {
      throw new DuplicateRegistrationError(['esta competencia'])
    }
    if (error.message && error.message.includes('Cupo agotado')) {
      const match = error.message.match(/la competencia "([^"]+)"/)
      throw new CompetitionFullError(match ? match[1] : 'seleccionada')
    }
    throw error
  }
  return data as Registration[]
}

export async function getRegistrationsByParticipant(
  participantId: string,
): Promise<RegistrationWithDetails[]> {
  if (!supabase) {
    const rows = mockRegistrations.filter((r) => r.participant_id === participantId).map((r) => ({
      ...r,
      competition: mockCompetitions.find((c) => c.id === r.competition_id),
    }))
    return simulate(rows)
  }

  const { data, error } = await supabase
    .from('registrations')
    .select('*, competition:competitions(*)')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as RegistrationWithDetails[]
}

export async function getRegistrationsCount(): Promise<number> {
  if (!supabase) return simulate(registrationsBuffer.length)
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Elimina una inscripción individual. Solo admin. */
export async function deleteRegistration(id: string): Promise<void> {
  if (!supabase) {
    const idx = registrationsBuffer.findIndex((r) => r.id === id)
    if (idx >= 0) registrationsBuffer.splice(idx, 1)
    return simulate(undefined)
  }

  const { error } = await supabase.from('registrations').delete().eq('id', id)
  if (error) throw error
}

/** Actualiza el estado de una inscripción individual (ej: REGISTERED -> ACTIVE). */
export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus,
): Promise<Registration> {
  if (!supabase) {
    const idx = registrationsBuffer.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Inscripción no encontrada')
    registrationsBuffer[idx] = { ...registrationsBuffer[idx], status }
    return simulate(registrationsBuffer[idx])
  }

  const { data, error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Registration
}

/**
 * Marca el check-in (asistencia) de una inscripción de forma atómica.
 * El filtro `checked_in_at is null` previene el doble check-in: si la fila
 * ya fue acreditada (o no existe), la actualización afecta 0 registros.
 */
export async function checkInRegistration(registrationId: string): Promise<Registration> {
  const now = new Date().toISOString()

  if (!supabase) {
    const idx = registrationsBuffer.findIndex((r) => r.id === registrationId)
    if (idx < 0 || registrationsBuffer[idx]?.checked_in_at) throw new AlreadyCheckedInError()
    registrationsBuffer[idx] = { ...registrationsBuffer[idx], checked_in_at: now }
    return simulate(registrationsBuffer[idx])
  }

  const { data, error } = await supabase
    .from('registrations')
    .update({ checked_in_at: now })
    .eq('id', registrationId)
    .is('checked_in_at', null)
    .select('*')

  if (error) throw error
  if (!data || data.length === 0) throw new AlreadyCheckedInError()
  return data[0] as Registration
}

/**
 * Acredita de una sola vez todas las inscripciones vigentes del participante
 * que aún no tenían check-in. Devuelve cuántas fueron acreditadas.
 */
export async function checkInRegistrationsForParticipant(participantId: string): Promise<number> {
  const now = new Date().toISOString()

  if (!supabase) {
    let count = 0
    for (const r of registrationsBuffer) {
      if (r.participant_id === participantId && r.status !== 'CANCELLED' && !r.checked_in_at) {
        r.checked_in_at = now
        count++
      }
    }
    return simulate(count)
  }

  const { data, error } = await supabase
    .from('registrations')
    .update({ checked_in_at: now })
    .eq('participant_id', participantId)
    .neq('status', 'CANCELLED')
    .is('checked_in_at', null)
    .select('id')

  if (error) throw error
  return (data ?? []).length
}

export interface AccreditationFilters {
  competitionId?: string
  churchId?: string
}

/** Resumen en vivo para la Mesa de Acreditación, con filtros opcionales. */
export async function getAccreditationSummary(
  filters: AccreditationFilters = {},
): Promise<AccreditationSummary> {
  if (!supabase) {
    const churchIds = new Set(
      filters.churchId
        ? participantsBuffer.filter((p) => p.church_id === filters.churchId).map((p) => p.id)
        : participantsBuffer.map((p) => p.id),
    )
    let rows = registrationsBuffer.filter((r) => churchIds.has(r.participant_id))
    if (filters.competitionId) rows = rows.filter((r) => r.competition_id === filters.competitionId)

    const active = rows.filter((r) => r.status !== 'CANCELLED')
    const checked = active.filter((r) => Boolean(r.checked_in_at))
    const participants = new Set(active.map((r) => r.participant_id))
    const checkedParticipants = new Set(checked.map((r) => r.participant_id))

    return simulate({
      totalRegistrations: rows.length,
      activeRegistrations: active.length,
      checkedInRegistrations: checked.length,
      pendingRegistrations: active.length - checked.length,
      uniqueParticipants: participants.size,
      checkedInParticipants: checkedParticipants.size,
      attendancePct:
        participants.size > 0 ? Math.round((checkedParticipants.size / participants.size) * 100) : 0,
    })
  }

  let query = supabase
    .from('registrations')
    .select('participant_id, status, checked_in_at, participant:participants!inner(id, church_id)')

  if (filters.competitionId) query = query.eq('competition_id', filters.competitionId)
  if (filters.churchId) query = query.eq('participants.church_id', filters.churchId)

  const { data, error } = await query
  if (error) throw error

  interface SummaryRow {
    participant_id: string
    status: string
    checked_in_at: string | null
  }

  const rows = (data ?? []) as SummaryRow[]
  const active = rows.filter((r) => r.status !== 'CANCELLED')
  const checked = active.filter((r) => Boolean(r.checked_in_at))
  const participants = new Set(active.map((r) => r.participant_id))
  const checkedParticipants = new Set(checked.map((r) => r.participant_id))

  return {
    totalRegistrations: rows.length,
    activeRegistrations: active.length,
    checkedInRegistrations: checked.length,
    pendingRegistrations: active.length - checked.length,
    uniqueParticipants: participants.size,
    checkedInParticipants: checkedParticipants.size,
    attendancePct:
      participants.size > 0 ? Math.round((checkedParticipants.size / participants.size) * 100) : 0,
  }
}