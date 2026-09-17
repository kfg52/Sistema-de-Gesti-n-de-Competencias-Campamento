import type { MatchWithDetails } from '@/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface MatchCardProps {
  match: MatchWithDetails
}

function resolveSideName(
  teamId: string | null,
  participantId: string | null,
  teamName?: string | null,
  participantLastName?: string | null,
): string {
  if (teamId && teamName) return teamName
  if (participantId && participantLastName) return participantLastName
  return 'Por definir'
}

export function MatchCard({ match }: MatchCardProps) {
  const nameA = resolveSideName(
    match.team_a_id,
    match.participant_a_id,
    match.team_a?.name,
    match.participant_a?.last_name,
  )
  const nameB = resolveSideName(
    match.team_b_id,
    match.participant_b_id,
    match.team_b?.name,
    match.participant_b?.last_name,
  )

  const isAWin =
    match.winner_team_id === match.team_a_id ||
    match.winner_participant_id === match.participant_a_id
  const isBWin =
    match.winner_team_id === match.team_b_id ||
    match.winner_participant_id === match.participant_b_id

  const someoneSet = Boolean(match.team_a_id || match.team_b_id || match.participant_a_id || match.participant_b_id)

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm border border-outline-variant/20 flex flex-col gap-space-xs">
      <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm px-1 pb-1">
        <StatusBadge status={match.status} kind="match" />
        <span className="font-label-badge text-label-badge text-on-surface-variant uppercase">
          {match.status === 'COMPLETED' ? 'Finalizado' : match.status === 'SCHEDULED' ? 'Pendiente' : 'En curso'}
        </span>
      </div>

      {someoneSet ? (
        <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-space-sm border border-surface-container-high gap-2">
          <div className={cn('flex-1 flex flex-col min-w-0', isAWin && 'font-bold', isBWin && 'opacity-60')}>
            <span className="font-label-lg text-label-lg text-on-surface truncate">{nameA}</span>
            <span className="font-body-sm text-body-sm text-primary font-medium truncate">
              {match.team_a?.name ? 'Equipo' : 'Individual'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-lg shadow-inner border border-outline-variant/30 flex-shrink-0">
            {match.status === 'COMPLETED' ? (
              <>
                <span className="font-score-display text-[22px] text-primary font-black">
                  {match.score_a ?? 0}
                </span>
                <span className="font-label-badge text-label-badge text-outline font-black">:</span>
                <span className="font-score-display text-[22px] text-secondary font-black">
                  {match.score_b ?? 0}
                </span>
              </>
            ) : (
              <span className="font-label-badge text-label-badge text-outline font-black px-1">VS</span>
            )}
          </div>

          <div className={cn('flex-1 flex flex-col min-w-0 items-end text-right', isBWin && 'font-bold', isAWin && 'opacity-60')}>
            <span className="font-label-lg text-label-lg text-on-surface truncate">{nameB}</span>
            <span className="font-body-sm text-body-sm text-secondary font-medium truncate">
              {match.team_b?.name ? 'Equipo' : 'Individual'}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-lg p-space-sm border border-surface-container-high text-center">
          <span className="font-body-sm text-body-sm text-on-surface-variant italic">
            Cuadro por completar
          </span>
        </div>
      )}
    </div>
  )
}