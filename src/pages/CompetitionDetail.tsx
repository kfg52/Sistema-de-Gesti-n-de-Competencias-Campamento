import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCompetitionById } from '@/services/competitions'
import { getTeamsByCompetition } from '@/services/teams'
import { getMatchesByCompetition } from '@/services/matches'
import { getRoundsByCompetition } from '@/services/rounds'
import type { Competition, MatchWithDetails, Round, Team } from '@/types'
import { COMPETITION_TYPE_LABEL } from '@/lib/constants'
import { TeamCard } from '@/components/cards/TeamCard'
import { MatchCard } from '@/components/cards/MatchCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'

type TeamWithCount = Team & { member_count: number }

export function CompetitionDetail() {
  const { id } = useParams<{ id: string }>()
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [teams, setTeams] = useState<TeamWithCount[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!id) {
      setError('Competencia no encontrada.')
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const comp = await getCompetitionById(id)
        if (!active) return
        if (!comp) {
          setError('Competencia no encontrada.')
          return
        }
        setCompetition(comp)
        const [teamRows, roundRows, matchRows] = await Promise.all([
          getTeamsByCompetition(comp.id),
          getRoundsByCompetition(comp.id),
          getMatchesByCompetition(comp.id),
        ])
        if (!active) return
        setTeams(teamRows)
        setRounds(roundRows)
        setMatches(matchRows)
        setError(null)
      } catch {
        if (active) setError('No pudimos cargar la competencia. Intenta nuevamente.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <LoadingState label="Cargando competencia..." rows={4} />

  if (error || !competition) {
    return <ErrorState message={error ?? 'Competencia no encontrada.'} />
  }

  const matchesByRound = rounds
    .map((round) => ({
      round,
      matches: matches.filter((m) => m.round_id === round.id),
    }))
    .filter((group) => group.matches.length > 0)

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg pt-space-sm gap-space-md">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-space-md flex flex-col gap-space-xs">
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-primary/10 pointer-events-none blur-2xl" />
        <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs font-label-badge text-label-badge uppercase tracking-wider font-extrabold">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {COMPETITION_TYPE_LABEL[competition.tipo]}
        </span>
        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-extrabold tracking-tight">
          {competition.name}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {competition.description}
        </p>
        <div className="flex items-center gap-2 pt-space-xs flex-wrap">
          <StatusBadge status="REGISTERED" kind="registration" />
          <span className="font-label-md text-label-md text-on-surface-variant">
            {competition.tipo === 'TEAM'
              ? `${competition.jugadores_por_equipo} jugadores por equipo`
              : 'Modalidad individual'}
          </span>
          {competition.max_cupos ? (
            <span className="font-label-md text-label-md font-semibold text-primary">
              · Cupo: {competition.max_cupos} atletas
            </span>
          ) : null}
        </div>
        {competition.permite_equipos && teams.length < 4 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant pt-space-xs">
            La creación de equipos se realiza en la consola de administración.
          </p>
        ) : null}
      </section>

      {/* Equipos */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Equipos</h2>
          {competition.permite_equipos ? (
            <Link to="/equipos" className="font-label-md text-label-md text-primary font-semibold hover:underline">
              Ver todos
            </Link>
          ) : null}
        </div>
        {competition.permite_equipos ? (
          teams.length > 0 ? (
            <div className="flex flex-col gap-space-sm">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} competitionId={competition.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20">
              <EmptyState
                icon="groups"
                title="Aún no hay equipos formados"
                description="La coordinación formará los equipos desde el panel administrativo."
              />
            </div>
          )
        ) : (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <EmptyState
              icon="person"
              title="Competencia individual"
              description="Cada participante inscrito compite directamente, sin equipos."
            />
          </div>
        )}
      </section>

      {/* Enfrentamientos */}
      <section className="flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold px-1">Enfrentamientos</h2>
        {matchesByRound.length > 0 ? (
          <div className="flex flex-col gap-space-md">
            {matchesByRound.map(({ round, matches: roundMatches }) => (
              <div key={round.id} className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between px-1">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    {round.name}
                  </span>
                  <span className="font-label-badge text-label-badge uppercase font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    Ronda {round.round_number}
                  </span>
                </div>
                <div className="flex flex-col gap-space-sm">
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <EmptyState
              icon="account_tree"
              title="Sin enfrentamientos aún"
              description="Las rondas se generarán desde la consola de administración."
            />
          </div>
        )}
      </section>
    </div>
  )
}