import type { ParticipantWithChurch } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { RegistrationStatus } from '@/types'

interface ParticipantCardProps {
  participant: ParticipantWithChurch
  registrationStatus?: RegistrationStatus
}

export function ParticipantCard({ participant, registrationStatus }: ParticipantCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex items-center gap-space-sm">
      <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-on-primary font-headline-sm text-headline-sm font-bold flex-shrink-0">
        {participant.first_name.charAt(0)}
        {participant.last_name.charAt(0)}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
          {participant.first_name} {participant.last_name}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
          {participant.church?.name ?? '—'} · <span className="font-mono">{participant.participant_code}</span>
        </span>
      </div>
      {registrationStatus ? (
        <StatusBadge status={registrationStatus} kind="registration" />
      ) : (
        <span className="flex-shrink-0 material-symbols-outlined text-on-surface-variant">
          chevron_right
        </span>
      )}
    </div>
  )
}