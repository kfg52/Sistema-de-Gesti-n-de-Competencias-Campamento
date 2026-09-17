import { useEffect, useState } from 'react'
import { getCompetitions } from '@/services/competitions'
import { getTeamsByCompetition } from '@/services/teams'
import type { Competition, Team } from '@/types'
import { TeamCard } from '@/components/cards/TeamCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

type TeamWithCount = Team & { member_count: number }

export function Teams() {
  const [teamCompetitions, setTeamCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [teams, setTeams] = useState<TeamWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const all = await getCompetitions()
        const teamComps = all.filter((c) => c.permite_equipos)
        if (!active) return
        setTeamCompetitions(teamComps)
        if (teamComps.length > 0) setSelectedId(teamComps[0].id)
      } catch {
        if (active) setError('No pudimos cargar los equipos.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!selectedId) return
    setLoading(true)
    ;(async () => {
      try {
        const rows = await getTeamsByCompetition(selectedId)
        if (active) setTeams(rows)
      } catch {
        if (active) setTeams([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedId])

  if (loading) return <LoadingState label="Cargando equipos..." rows={4} />
  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col w-full pb-space-lg gap-space-sm">
      {/* Selector de competencias */}
      <div className="w-full bg-surface-container-low px-gutter py-space-sm sticky top-0 z-30 backdrop-blur-md border-b border-surface-container-high/60">
        {teamCompetitions.length > 0 ? (
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
            {teamCompetitions.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => setSelectedId(comp.id)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-transform active:scale-95',
                  selectedId === comp.id
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60',
                )}
              >
                {comp.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="px-gutter flex flex-col gap-space-sm pt-space-xs">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Planteles Registrados
          </h2>
          <span className="font-label-badge text-label-badge font-bold text-primary uppercase">
            {teams.length} equipos
          </span>
        </div>

        {teams.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} competitionId={selectedId} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <EmptyState
              icon="groups"
              title="No hay equipos en esta competencia"
              description="La coordinación formará los equipos desde el panel administrativo."
            />
          </div>
        )}
      </div>
    </div>
  )
}