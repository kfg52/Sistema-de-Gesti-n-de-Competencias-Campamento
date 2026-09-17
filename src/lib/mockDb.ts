import type {
  Church,
  Competition,
  Match,
  Participant,
  RankingPoints,
  Registration,
  Round,
  Team,
  TeamMember,
} from '@/types'
import { FALLBACK_CHURCHES, INITIAL_COMPETITIONS } from '@/lib/constants'

/**
 * Base de datos local en memoria usada en "modo demo"
 * (cuando Supabase no está configurado). Refleja la estructura real.
 */

const now = new Date().toISOString()

export const mockChurches: Church[] = FALLBACK_CHURCHES.map((c, i) => ({
  ...c,
  id: `ch-${i + 1}`,
}))

export const mockCompetitions: Competition[] = INITIAL_COMPETITIONS.map((c, i) => ({
  ...c,
  id: `cmp-${i + 1}`,
  created_at: now,
  updated_at: now,
}))

const cmpId = (name: string) => mockCompetitions.find((c) => c.name === name)?.id ?? ''
const chId = (name: string) => mockChurches.find((c) => c.name === name)?.id ?? ''

export const mockParticipants: Participant[] = [
  ['Juan', 'Pérez', 'IDP La Romana'],
  ['Carlos', 'Martínez', 'IDP La Romana'],
  ['Pedro', 'Gómez', 'IDP La Romana'],
  ['Miguel', 'Santos', 'IDP La Romana'],
  ['David', 'Rodríguez', 'IDP La Romana'],
  ['Mateo', 'Morales', 'IDP Santiago'],
  ['Lucas', 'Silva', 'IDP Santiago'],
  ['Andrés', 'Navarro', 'IDP Santiago'],
  ['Felipe', 'Castro', 'IDP Santiago'],
  ['Samuel', 'Ortega', 'IDP Santiago'],
  ['Gabriel', 'Rojas', 'IDP Santo Domingo'],
  ['Esteban', 'Lima', 'IDP Santo Domingo'],
  ['Isaac', 'Peña', 'IDP Santo Domingo'],
  ['Daniel', 'Vargas', 'IDP Santo Domingo'],
  ['Jonathan', 'Cruz', 'IDP Santo Domingo'],
  ['Emanuel', 'Díaz', 'IDP San Cristóbal'],
  ['Marcos', 'Herrera', 'IDP San Cristóbal'],
  ['Joel', 'Benítez', 'IDP San Cristóbal'],
  ['Benjamín', 'Ramos', 'IDP San Cristóbal'],
  ['Alejandro', 'Núñez', 'IDP Duarte'],
  ['Raúl', 'Campos', 'IDP La Romana'],
  ['Víctor', 'Valdez', 'IDP Santiago'],
  ['Ramón', 'Antigua', 'IDP Santiago Rodríguez'],
].map(([first_name, last_name, church_name], i) => ({
  id: `p-${i + 1}`,
  first_name,
  last_name,
  church_id: chId(church_name),
  participant_code: `CMP-${String(i + 1).padStart(5, '0')}`,
  participant_token: `demo-token-p${i + 1}`,
  created_at: now,
  updated_at: now,
}))

const pid = (name: string) => mockParticipants.find((p) => `${p.first_name} ${p.last_name}` === name)?.id ?? ''

let regSeq = 0
export const mockRegistrations: Registration[] = [
  // Basketball (equipos)
  ['Juan Pérez', 'Carlos Martínez', 'Pedro Gómez', 'Miguel Santos', 'David Rodríguez'],
  ['Mateo Morales', 'Lucas Silva', 'Andrés Navarro', 'Felipe Castro'],
  ['Samuel Ortega', 'Gabriel Rojas', 'Esteban Lima', 'Isaac Peña', 'Daniel Vargas'],
  ['Jonathan Cruz', 'Emanuel Díaz', 'Marcos Herrera', 'Joel Benítez', 'Benjamín Ramos'],
  ['Raúl Campos', 'Víctor Valdez', 'Alejandro Núñez'],
]
  .flat()
  .map((name) => ({
    id: `reg-${++regSeq}`,
    participant_id: pid(name),
    competition_id: cmpId('Basketball'),
    status: 'REGISTERED' as const,
    created_at: now,
  }))
  .concat(
    // Natación
    ['Raúl Campos', 'Víctor Valdez', 'Alejandro Núñez', 'Emanuel Díaz'].map((name) => ({
      id: `reg-${++regSeq}`,
      participant_id: pid(name),
      competition_id: cmpId('Natación'),
      status: 'REGISTERED' as const,
      created_at: now,
    })),
    // Carrera
    ['Juan Pérez', 'Mateo Morales', 'Samuel Ortega', 'Jonathan Cruz', 'Ramón Antigua'].map((name) => ({
      id: `reg-${++regSeq}`,
      participant_id: pid(name),
      competition_id: cmpId('Carrera campo traviesa'),
      status: 'REGISTERED' as const,
      created_at: now,
    })),
    // Ajedrez
    ['Juan Pérez', 'Mateo Morales', 'Gabriel Rojas', 'Daniel Vargas', 'Marcos Herrera', 'Ramón Antigua'].map(
      (name) => ({
        id: `reg-${++regSeq}`,
        participant_id: pid(name),
        competition_id: cmpId('Ajedrez'),
        status: 'REGISTERED' as const,
        created_at: now,
      }),
    ),
    // Dominó
    ['Juan Pérez', 'Carlos Martínez', 'Mateo Morales', 'Samuel Ortega', 'Gabriel Rojas', 'Esteban Lima'].map(
      (name) => ({
        id: `reg-${++regSeq}`,
        participant_id: pid(name),
        competition_id: cmpId('Dominó'),
        status: 'REGISTERED' as const,
        created_at: now,
      }),
    ),
  )

export const mockTeams: Team[] = [
  { id: 't-1', competition_id: cmpId('Basketball'), name: 'Los Titanes', max_players: 5, status: 'FULL', created_at: now, updated_at: now },
  { id: 't-2', competition_id: cmpId('Basketball'), name: 'Los Guerreros', max_players: 5, status: 'OPEN', created_at: now, updated_at: now },
  { id: 't-3', competition_id: cmpId('Basketball'), name: 'Los Halcones', max_players: 5, status: 'FULL', created_at: now, updated_at: now },
  { id: 't-4', competition_id: cmpId('Basketball'), name: 'Los Leones', max_players: 5, status: 'FULL', created_at: now, updated_at: now },
  { id: 't-5', competition_id: cmpId('Basketball'), name: 'Patriotas', max_players: 5, status: 'FULL', created_at: now, updated_at: now },
  { id: 'dt-1', competition_id: cmpId('Dominó'), name: 'Dupla Este', max_players: 2, status: 'CHAMPION', created_at: now, updated_at: now },
  { id: 'dt-2', competition_id: cmpId('Dominó'), name: 'Dupla Norte', max_players: 2, status: 'FINALIST', created_at: now, updated_at: now },
]

const bk = (teamName: string): string =>
  mockTeams.find((t) => t.competition_id === cmpId('Basketball') && t.name === teamName)?.id ?? ''

let memberSeq = 0
export const mockTeamMembers: TeamMember[] = [
  ['Los Titanes', ['Juan Pérez', 'Carlos Martínez', 'Pedro Gómez', 'Miguel Santos', 'David Rodríguez']],
  ['Los Guerreros', ['Mateo Morales', 'Lucas Silva', 'Andrés Navarro', 'Felipe Castro']],
  ['Los Halcones', ['Samuel Ortega', 'Gabriel Rojas', 'Esteban Lima', 'Isaac Peña', 'Daniel Vargas']],
  ['Los Leones', ['Jonathan Cruz', 'Emanuel Díaz', 'Marcos Herrera', 'Joel Benítez', 'Benjamín Ramos']],
  ['Patriotas', ['Raúl Campos', 'Víctor Valdez', 'Alejandro Núñez']],
  ['Dupla Este', ['Juan Pérez', 'Carlos Martínez']],
  ['Dupla Norte', ['Mateo Morales', 'Samuel Ortega']],
]
  .flatMap(([teamName, members]) =>
    (members as string[]).map((participantName) => {
      const team = mockTeams.find((t) => t.name === teamName)
      return {
        id: `tm-${++memberSeq}`,
        team_id: team?.id ?? '',
        participant_id: pid(participantName),
        created_at: now,
      }
    }),
  )

export const mockRounds: Round[] = [
  { id: 'r-1', competition_id: cmpId('Basketball'), name: 'Cuartos de Final', round_number: 1, status: 'COMPLETED', created_at: now },
  { id: 'r-2', competition_id: cmpId('Basketball'), name: 'Semifinal', round_number: 2, status: 'ACTIVE', created_at: now },
  { id: 'r-3', competition_id: cmpId('Basketball'), name: 'Gran Final', round_number: 3, status: 'PENDING', created_at: now },
  { id: 'rd-1', competition_id: cmpId('Dominó'), name: 'Final', round_number: 1, status: 'COMPLETED', created_at: now },
]

export const mockMatches: Match[] = [
  {
    id: 'm-1',
    competition_id: cmpId('Basketball'),
    round_id: 'r-1',
    participant_a_id: null,
    participant_b_id: null,
    team_a_id: bk('Los Titanes'),
    team_b_id: bk('Los Guerreros'),
    score_a: 52,
    score_b: 45,
    winner_participant_id: null,
    winner_team_id: bk('Los Titanes'),
    status: 'COMPLETED',
    next_match_id: 'm-5',
    created_at: now,
    completed_at: now,
  },
  {
    id: 'm-2',
    competition_id: cmpId('Basketball'),
    round_id: 'r-1',
    participant_a_id: null,
    participant_b_id: null,
    team_a_id: bk('Los Halcones'),
    team_b_id: bk('Los Leones'),
    score_a: 41,
    score_b: 38,
    winner_participant_id: null,
    winner_team_id: bk('Los Halcones'),
    status: 'COMPLETED',
    next_match_id: 'm-5',
    created_at: now,
    completed_at: now,
  },
  {
    id: 'm-5',
    competition_id: cmpId('Basketball'),
    round_id: 'r-2',
    participant_a_id: null,
    participant_b_id: null,
    team_a_id: bk('Los Titanes'),
    team_b_id: bk('Los Halcones'),
    score_a: null,
    score_b: null,
    winner_participant_id: null,
    winner_team_id: null,
    status: 'SCHEDULED',
    next_match_id: 'm-7',
    created_at: now,
    completed_at: null,
  },
  {
    id: 'm-7',
    competition_id: cmpId('Basketball'),
    round_id: 'r-3',
    participant_a_id: null,
    participant_b_id: null,
    team_a_id: null,
    team_b_id: null,
    score_a: null,
    score_b: null,
    winner_participant_id: null,
    winner_team_id: null,
    status: 'SCHEDULED',
    next_match_id: null,
    created_at: now,
    completed_at: null,
  },
  {
    id: 'md-1',
    competition_id: cmpId('Dominó'),
    round_id: 'rd-1',
    participant_a_id: null,
    participant_b_id: null,
    team_a_id: 'dt-1',
    team_b_id: 'dt-2',
    score_a: 100,
    score_b: 85,
    winner_participant_id: null,
    winner_team_id: 'dt-1',
    status: 'COMPLETED',
    next_match_id: null,
    created_at: now,
    completed_at: now,
  },
]

export const mockRankingPoints: RankingPoints = {
  id: 'rp-1',
  first_place: 10,
  second_place: 6,
  third_place: 4,
  participation: 2,
  victory: 3,
  updated_at: now,
}

/** Secuencia local para códigos de participante en modo demo. */
let codeSeq = mockParticipants.length
let localSeq = 0

export function nextLocalParticipantCode(): string {
  codeSeq += 1
  return `CMP-${String(codeSeq).padStart(5, '0')}`
}

export function localRefreshToken(): string {
  return `demo-token-${Date.now().toString(36)}-${++localSeq}`
}

/** Limpia un estado mutable compartido entre servicios demo. */
export function resetMockDatabase() {
  codeSeq = mockParticipants.length
  localSeq = 0
  registrationsBuffer.length = 0
  participantsBuffer.length = 0
}

// Buffers mutables usados por los servicios demo (auto-registro).
export const participantsBuffer: Participant[] = [...mockParticipants]
export const registrationsBuffer: Registration[] = [...mockRegistrations]
export const teamMembersBuffer: TeamMember[] = [...mockTeamMembers]