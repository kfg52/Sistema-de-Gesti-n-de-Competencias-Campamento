import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTeamById } from '@/services/teams'
import { ParticipantCard } from '@/components/cards/ParticipantCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Team, TeamMemberWithParticipant } from '@/types'

type TeamDetail = Team & { members: TeamMemberWithParticipant[] }

export function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!id) {
      setError('Equipo no encontrado.')
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const found = await getTeamById(id)
        if (!active) return
        setTeam(found)
        setError(found ? null : 'Equipo no encontrado.')
      } catch {
        if (active) setError('No pudimos cargar el equipo.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <LoadingState label="Cargando equipo..." rows={3} />
  if (error) return <ErrorState message={error} />

  if (!team) {
    return (
      <EmptyState
        icon="groups"
        title="Equipo no encontrado"
        description="El equipo que buscas no existe o fue eliminado."
        action={
          <Link
            to="/equipos"
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold"
          >
            Ver equipos
          </Link>
        }
      />
    )
  }

  const spotsOpen = team.max_players - team.members.length

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg pt-space-sm gap-space-md">
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-space-md flex flex-col gap-space-xs">
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-secondary/10 pointer-events-none blur-2xl" />
        <div className="flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-xl bg-secondary text-on-primary flex items-center justify-center font-headline-md text-headline-md font-bold shadow-sm">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold truncate">
              {team.name}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {team.members.length} de {team.max_players} jugadores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-space-xs">
          <StatusBadge status={team.status} kind="team" />
          {spotsOpen > 0 ? (
            <span className="font-label-badge text-label-badge px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              {spotsOpen} cupo{spotsOpen > 1 ? 's' : ''} disponible{spotsOpen > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Plantel</h2>
          <span className="font-label-badge text-label-badge font-bold text-primary uppercase">
            {team.members.length}/{team.max_players}
          </span>
        </div>
        {team.members.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {team.members.map((member, index) => (
              <div key={member.id} className="flex items-center gap-space-sm">
                <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-sm text-label-sm font-bold flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  {member.participant ? (
                    <ParticipantCard participant={member.participant} />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="person_add"
            title="Sin integrantes"
            description="Este equipo aún no tiene jugadores asignados."
          />
        )}
      </section>
    </div>
  )
}