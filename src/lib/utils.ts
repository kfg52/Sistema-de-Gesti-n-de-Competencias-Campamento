import type { MatchStatus, RegistrationStatus, TeamStatus } from '@/types'

/** Une clases de Tailwind de forma condicional. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const REGISTRATION_STATUS_META: Record<
  RegistrationStatus,
  { label: string; emoji: string; className: string }
> = {
  REGISTERED: { label: 'Pendiente', emoji: '🟡', className: 'bg-amber-100 text-amber-800' },
  ACTIVE: { label: 'Activo', emoji: '🟢', className: 'bg-emerald-100 text-emerald-800' },
  ELIMINATED: { label: 'Eliminado', emoji: '🔴', className: 'bg-red-100 text-red-700' },
  FINISHED: { label: 'Campeón', emoji: '🏆', className: 'bg-amber-100 text-amber-900' },
  CANCELLED: { label: 'Cancelado', emoji: '⚪', className: 'bg-surface-container-high text-on-surface-variant' },
}

export const TEAM_STATUS_META: Record<TeamStatus, { label: string; emoji: string; className: string }> = {
  OPEN: { label: 'Incompleto', emoji: '🟡', className: 'bg-amber-100 text-amber-800' },
  FULL: { label: 'Activo', emoji: '🟢', className: 'bg-emerald-100 text-emerald-800' },
  ACTIVE: { label: 'En competencia', emoji: '🔵', className: 'bg-sky-100 text-sky-800' },
  ELIMINATED: { label: 'Eliminado', emoji: '🔴', className: 'bg-red-100 text-red-700' },
  FINALIST: { label: 'Finalista', emoji: '🥈', className: 'bg-amber-100 text-amber-900' },
  CHAMPION: { label: 'Campeón', emoji: '🏆', className: 'bg-amber-100 text-amber-900' },
}

export const MATCH_STATUS_META: Record<MatchStatus, { label: string; emoji: string; className: string }> = {
  SCHEDULED: { label: 'Pendiente', emoji: '🟡', className: 'bg-amber-100 text-amber-800' },
  IN_PROGRESS: { label: 'En curso', emoji: '🔵', className: 'bg-sky-100 text-sky-800' },
  COMPLETED: { label: 'Finalizado', emoji: '🟢', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', emoji: '⚪', className: 'bg-surface-container-high text-on-surface-variant' },
}

export function teamMemberCount(total: number, max: number): string {
  return `${Math.min(total, max)} de ${max} jugadores`
}