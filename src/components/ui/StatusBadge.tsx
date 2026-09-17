import {
  MATCH_STATUS_META,
  REGISTRATION_STATUS_META,
  TEAM_STATUS_META,
  cn,
} from '@/lib/utils'
import type { MatchStatus, RegistrationStatus, TeamStatus } from '@/types'

type StatusKind = 'registration' | 'team' | 'match'

interface StatusBadgeProps {
  status: RegistrationStatus | TeamStatus | MatchStatus
  kind?: StatusKind
  className?: string
}

export function StatusBadge({ status, kind = 'registration', className }: StatusBadgeProps) {
  const meta =
    kind === 'team'
      ? TEAM_STATUS_META[status as TeamStatus]
      : kind === 'match'
        ? MATCH_STATUS_META[status as MatchStatus]
        : REGISTRATION_STATUS_META[status as RegistrationStatus]

  return (
    <span
      className={cn(
        'font-label-badge text-label-badge px-2 py-0.5 rounded-full flex items-center gap-1 font-bold uppercase',
        meta.className,
        className,
      )}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  )
}