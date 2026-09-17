export interface Church {
  id: string
  name: string
  created_at: string
}

export type CompetitionType = 'TEAM' | 'INDIVIDUAL'

export type CompetitionStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FINISHED'

export interface Competition {
  id: string
  name: string
  description: string | null
  tipo: CompetitionType
  jugadores_por_equipo: number
  permite_equipos: boolean
  max_cupos?: number | null
  activa: boolean
  estado: CompetitionStatus
  created_at: string
  updated_at: string
}

export interface CompetitionWithStats extends Competition {
  registrations_count: number
  cupos_disponibles: number | null
  is_full: boolean
}

export interface Participant {
  id: string
  first_name: string
  last_name: string
  church_id: string
  participant_code: string
  participant_token: string
  created_at: string
  updated_at: string
}

/** Participante con su iglesia incluida (join) */
export interface ParticipantWithChurch extends Participant {
  church?: Pick<Church, 'id' | 'name'>
}

export type RegistrationStatus =
  | 'REGISTERED'
  | 'ACTIVE'
  | 'ELIMINATED'
  | 'FINISHED'
  | 'CANCELLED'

export interface Registration {
  id: string
  participant_id: string
  competition_id: string
  status: RegistrationStatus
  /** Marca temporal de check-in (asistencia). null/undefined = aún no acreditado. */
  checked_in_at?: string | null
  created_at: string
}

export interface RegistrationWithDetails extends Registration {
  competition?: Competition
}

/** Resumen en vivo de la Mesa de Acreditación / Check-in. */
export interface AccreditationSummary {
  /** Todas las inscripciones que cumplen los filtros (incluye canceladas). */
  totalRegistrations: number
  /** Inscripciones vigentes (status <> CANCELLED). */
  activeRegistrations: number
  /** Inscripciones vigentes con check-in realizado. */
  checkedInRegistrations: number
  /** Inscripciones vigentes sin check-in. */
  pendingRegistrations: number
  /** Atletas distintos con al menos una inscripción vigente. */
  uniqueParticipants: number
  /** Atletas distintos con al menos un check-in realizado. */
  checkedInParticipants: number
  /** Porcentaje de atletas acreditados sobre el total (0-100). */
  attendancePct: number
}

export type TeamStatus =
  | 'OPEN'
  | 'FULL'
  | 'ACTIVE'
  | 'ELIMINATED'
  | 'FINALIST'
  | 'CHAMPION'

export interface Team {
  id: string
  competition_id: string
  name: string
  max_players: number
  status: TeamStatus
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  participant_id: string
  created_at: string
}

export interface TeamMemberWithParticipant extends TeamMember {
  participant?: ParticipantWithChurch
}

export type RoundStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED'

export interface Round {
  id: string
  competition_id: string
  name: string
  round_number: number
  status: RoundStatus
  created_at: string
}

export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Match {
  id: string
  competition_id: string
  round_id: string | null
  participant_a_id: string | null
  participant_b_id: string | null
  team_a_id: string | null
  team_b_id: string | null
  score_a: number | null
  score_b: number | null
  winner_participant_id: string | null
  winner_team_id: string | null
  status: MatchStatus
  next_match_id: string | null
  created_at: string
  completed_at: string | null
}

export interface MatchWithDetails extends Match {
  participant_a?: ParticipantWithChurch | null
  participant_b?: ParticipantWithChurch | null
  team_a?: Team | null
  team_b?: Team | null
  winner_team?: Team | null
  winner_participant?: ParticipantWithChurch | null
}

export interface RankingPoints {
  id: string
  first_place: number
  second_place: number
  third_place: number
  participation: number
  victory: number
  updated_at: string
}

export interface ChurchStanding {
  church_id: string
  church_name: string
  total_points: number
  gold: number
  silver: number
  bronze: number
  victories: number
  participations: number
}

export interface CompetitionPodium {
  competition_id: string
  competition_name: string
  champion: string | null
  runner_up: string | null
  third: string[]
}

export interface Classification {
  config: RankingPoints | null
  standings: ChurchStanding[]
  podiums: CompetitionPodium[]
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
}

/** Estadísticas mostradas en el dashboard/inicio */
export interface DashboardStats {
  participants: number
  registrations: number
  competitions_active: number
  teams: number
  matches_pending: number
  matches_completed: number
  competitions_finished: number
}