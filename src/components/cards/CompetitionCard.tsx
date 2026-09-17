import { Link } from 'react-router-dom'
import type { Competition, CompetitionWithStats } from '@/types'
import { COMPETITION_TYPE_LABEL } from '@/lib/constants'

const COMPETITION_META: Record<string, { icon: string; iconColor: string; pill: string }> = {
  Basketball: {
    icon: 'sports_basketball',
    iconColor: 'text-primary bg-primary-fixed/60',
    pill: 'text-primary',
  },
  Baseball: {
    icon: 'sports_baseball',
    iconColor: 'text-secondary bg-secondary-fixed',
    pill: 'text-secondary',
  },
  'Dominó': {
    icon: 'casino',
    iconColor: 'text-tertiary bg-tertiary-fixed',
    pill: 'text-tertiary',
  },
  'Natación': {
    icon: 'pool',
    iconColor: 'text-secondary bg-secondary-fixed',
    pill: 'text-secondary',
  },
  'Carrera campo traviesa': {
    icon: 'hiking',
    iconColor: 'text-primary bg-primary-fixed/60',
    pill: 'text-primary',
  },
  'Ajedrez': {
    icon: 'neurology',
    iconColor: 'text-secondary bg-surface-container-high',
    pill: 'text-secondary',
  },
}

interface CompetitionCardProps {
  competition: Competition | CompetitionWithStats
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const meta = COMPETITION_META[competition.name] ?? {
    icon: 'emoji_events',
    iconColor: 'text-primary bg-primary-fixed/60',
    pill: 'text-primary',
  }

  const hasStats = 'registrations_count' in competition
  const isFull = hasStats && (competition as CompetitionWithStats).is_full
  const stats = hasStats ? (competition as CompetitionWithStats) : null

  const subtitle =
    competition.tipo === 'TEAM'
      ? `${competition.jugadores_por_equipo} jugadores por equipo`
      : 'Competencia individual'

  return (
    <Link
      to={`/competencia/${competition.id}`}
      className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-space-sm transition-transform active:scale-[0.97] hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <div
          className={`w-10 h-10 rounded-lg ${meta.iconColor} flex items-center justify-center`}
        >
          <span className="material-symbols-outlined text-[24px]">{meta.icon}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isFull ? (
            <span className="font-label-badge text-label-badge px-1.5 py-0.5 rounded bg-error/15 text-error font-bold uppercase">
              Agotado
            </span>
          ) : stats && stats.max_cupos ? (
            <span className="font-label-badge text-label-badge px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
              {stats.registrations_count}/{stats.max_cupos}
            </span>
          ) : null}
          <span className="font-label-badge text-label-badge px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold uppercase">
            {COMPETITION_TYPE_LABEL[competition.tipo]}
          </span>
        </div>
      </div>
      <div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">
          {competition.name}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
      <div className="pt-1 flex items-center justify-between">
        <span className={`font-label-badge text-label-badge font-bold uppercase ${meta.pill}`}>
          {competition.permite_equipos ? 'Formación de equipos' : 'Inscripción individual'}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          arrow_forward
        </span>
      </div>
    </Link>
  )
}