import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompetitions } from '@/services/competitions'
import { getMatchesByCompetition } from '@/services/matches'
import { getRoundsByCompetition } from '@/services/rounds'
import { MatchCard } from '@/components/cards/MatchCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { Competition, MatchWithDetails, Round } from '@/types'

export function Results() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [rounds, setRounds] = useState<Round[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedCompetition = competitions.find((c) => c.id === selectedId)

  const loadMatches = useCallback(async (competitionId: string) => {
    setLoading(true)
    try {
      const [roundRows, matchRows] = await Promise.all([
        getRoundsByCompetition(competitionId),
        getMatchesByCompetition(competitionId),
      ])
      setRounds(roundRows)
      setMatches(matchRows)
      setError(null)
    } catch {
      setRounds([])
      setMatches([])
      setError('No pudimos cargar los resultados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getCompetitions()
      .then((all) => {
        if (!active) return
        setCompetitions(all)
        if (all.length > 0) setSelectedId(all[0].id)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las competencias.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (selectedId) void loadMatches(selectedId)
  }, [selectedId, loadMatches])

  const groups = rounds
    .map((round) => ({
      round,
      matches: matches.filter((m) => m.round_id === round.id),
    }))
    .filter((group) => group.matches.length > 0)

  const completed = matches.filter((m) => m.status === 'COMPLETED').length

  return (
    <div className="flex flex-col w-full pb-space-lg gap-space-sm">
      {/* Selector de competencias */}
      <div className="w-full bg-surface-container-low px-gutter py-space-sm sticky top-[96px] z-30 backdrop-blur-md border-b border-surface-container-high/60">
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
          {competitions.map((comp) => (
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
      </div>

      <div className="px-gutter flex flex-col gap-space-md">
        {selectedCompetition ? (
          <div className="flex items-center justify-between px-1">
            <div>
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Resultados
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {selectedCompetition.name} · {completed}/{matches.length} partidos jugados
              </p>
            </div>
            <Link
              to={`/competencias/${selectedCompetition.id}`}
              className="font-label-md text-label-md text-primary font-semibold hover:underline"
            >
              Ver detalle
            </Link>
          </div>
        ) : null}

        {loading ? (
          <LoadingState label="Cargando resultados…" rows={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : matches.length > 0 ? (
          groups.map(({ round, matches: roundMatches }) => (
            <section key={round.id} className="flex flex-col gap-space-sm">
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
            </section>
          ))
        ) : (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <EmptyState
              icon="account_tree"
              title="Sin enfrentamientos"
              description="Las rondas de esta competencia se generarán próximamente."
            />
          </div>
        )}
      </div>
    </div>
  )
}