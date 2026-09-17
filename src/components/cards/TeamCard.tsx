import { Link } from 'react-router-dom'
import type { Team } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { teamMemberCount } from '@/lib/utils'

interface TeamCardProps {
  team: Team & { member_count: number }
  competitionId: string
}

export function TeamCard({ team, competitionId }: TeamCardProps) {
  const isFull = team.member_count >= team.max_players
  const isChampion = team.status === 'CHAMPION'

  return (
    <Link
      to={`/equipos/${team.id}`}
      className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-space-sm transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-sm text-on-primary flex-shrink-0 ${
              isChampion ? 'bg-tertiary' : 'bg-secondary'
            }`}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
              {team.name}
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {teamMemberCount(team.member_count, team.max_players)}
            </p>
          </div>
        </div>
        <StatusBadge status={team.status} kind="team" />
      </div>

      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            isFull ? 'bg-emerald-500' : isChampion ? 'bg-tertiary' : 'bg-primary/60'
          }`}
          style={{ width: `${Math.min(100, (team.member_count / team.max_players) * 100)}%` }}
        />
      </div>

      {competitionId ? (
        <div className="pt-1 flex items-center justify-between">
          <span className="font-label-badge text-label-badge uppercase font-bold text-primary">
            Ver plantel
          </span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            arrow_forward
          </span>
        </div>
      ) : null}
    </Link>
  )
}