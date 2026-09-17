import { useCompetitions } from '@/hooks/useCompetitions'
import { CompetitionCard } from '@/components/cards/CompetitionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'

export function Competitions() {
  const { competitions, loading, error } = useCompetitions()

  if (loading) return <LoadingState label="Cargando competencias..." rows={4} />
  if (error) return <ErrorState message="⚠️ No pudimos cargar las competencias. Intenta nuevamente." />

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg pt-space-sm gap-space-sm">
      <div className="flex items-center justify-between px-1 pt-space-sm">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Disciplinas del Torneo
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Selecciona una competencia para ver equipos, normas y enfrentamientos
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-badge text-label-badge font-bold">
          {competitions.length} ACTIVAS
        </span>
      </div>

      {competitions.length > 0 ? (
        <div className="grid grid-cols-2 gap-space-sm mt-space-xs">
          {competitions.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      ) : (
        <EmptyState icon="sports" title="Aún no hay competencias activas" />
      )}
    </div>
  )
}