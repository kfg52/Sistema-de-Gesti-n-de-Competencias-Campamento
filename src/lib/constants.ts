import type { Church, Competition, CompetitionType } from '@/types'

/** Las 31 iglesias obligatorias — se usan como respaldo offline. */
export const FALLBACK_CHURCHES: Church[] = [
  'IDP Azua',
  'IDP Bahoruco',
  'IDP Barahona',
  'IDP Dajabón',
  'IDP Duarte',
  'IDP Elías Piña',
  'IDP El Seibo',
  'IDP Espaillat',
  'IDP Hato Mayor',
  'IDP Hermanas Mirabal',
  'IDP Independencia',
  'IDP La Altagracia',
  'IDP La Romana',
  'IDP La Vega',
  'IDP María Trinidad Sánchez',
  'IDP Monseñor Nouel',
  'IDP Monte Cristi',
  'IDP Monte Plata',
  'IDP Pedernales',
  'IDP Peravia',
  'IDP Puerto Plata',
  'IDP Samaná',
  'IDP San Cristóbal',
  'IDP San José de Ocoa',
  'IDP San Juan',
  'IDP San Pedro de Macorís',
  'IDP Sánchez Ramírez',
  'IDP Santiago',
  'IDP Santiago Rodríguez',
  'IDP Santo Domingo',
  'IDP Valverde',
].map((name, i) => ({
  id: `church-${i + 1}`,
  name,
  created_at: new Date().toISOString(),
}))

/** Configuración inicial de las 6 competencias. */
export const INITIAL_COMPETITIONS: Array<
  Pick<Competition, 'name' | 'description' | 'tipo' | 'jugadores_por_equipo' | 'permite_equipos' | 'max_cupos' | 'activa' | 'estado'>
> = [
  {
    name: 'Basketball',
    description: 'Torneo de baloncesto 5 vs 5.',
    tipo: 'TEAM',
    jugadores_por_equipo: 5,
    permite_equipos: true,
    max_cupos: 60,
    activa: true,
    estado: 'ACTIVE',
  },
  {
    name: 'Baseball',
    description: 'Torneo de béisbol 9 vs 9.',
    tipo: 'TEAM',
    jugadores_por_equipo: 9,
    permite_equipos: true,
    max_cupos: 72,
    activa: true,
    estado: 'ACTIVE',
  },
  {
    name: 'Dominó',
    description: 'Torneo de dominó por mesas (parejas).',
    tipo: 'TEAM',
    jugadores_por_equipo: 2,
    permite_equipos: true,
    max_cupos: 32,
    activa: true,
    estado: 'ACTIVE',
  },
  {
    name: 'Natación',
    description: '50m libre, eliminatoria directa individual.',
    tipo: 'INDIVIDUAL',
    jugadores_por_equipo: 1,
    permite_equipos: false,
    max_cupos: 40,
    activa: true,
    estado: 'ACTIVE',
  },
  {
    name: 'Carrera campo traviesa',
    description: 'Ruta de 3K por sendero, individual.',
    tipo: 'INDIVIDUAL',
    jugadores_por_equipo: 1,
    permite_equipos: false,
    max_cupos: 100,
    activa: true,
    estado: 'ACTIVE',
  },
  {
    name: 'Ajedrez',
    description: 'Sistema suizo, 5 rondas, individual.',
    tipo: 'INDIVIDUAL',
    jugadores_por_equipo: 1,
    permite_equipos: false,
    max_cupos: 32,
    activa: true,
    estado: 'ACTIVE',
  },
]

export const COMPETITION_TYPE_LABEL: Record<CompetitionType, string> = {
  TEAM: 'Por equipos',
  INDIVIDUAL: 'Individual',
}

export const NAV_ITEMS = [
  { path: '/', label: 'Inicio', icon: 'stadium' },
  { path: '/registro', label: 'Inscripción', icon: 'how_to_reg' },
  { path: '/mis-competencias', label: 'Mis Juegos', icon: 'sports_score' },
  { path: '/equipos', label: 'Equipos', icon: 'groups' },
  { path: '/resultados', label: 'Brackets', icon: 'leaderboard' },
  { path: '/admin', label: 'Admin', icon: 'tune' },
] as const

/** Clave de localStorage que guarda el token del participante tras registrarse. */
export const PARTICIPANT_TOKEN_KEY = 'idp_participant_token'