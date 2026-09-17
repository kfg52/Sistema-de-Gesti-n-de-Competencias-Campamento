import { useEffect, useState } from 'react'
import { getClassification } from '@/services/classification'
import type { Classification, ChurchStanding } from '@/types'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

const MEDAL_DOT = {
  gold: 'bg-amber-400',
  silver: 'bg-slate-300',
  bronze: 'bg-orange-400',
} as const

export function ClassificationPage() {
  const [data, setData] = useState<Classification | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getClassification()
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <LoadingState label="Calculando clasificación…" rows={3} />
      </div>
    )
  }

  if (error || !data || !data.config) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <ErrorState message={error ?? 'No hay configuración de puntos registrada.'} />
      </div>
    )
  }

  const { config, standings, podiums } = data
  const podios = podiums.filter((p) => p.champion !== null)

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      <header className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Clasificación General</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Puntos por iglesia según resultados y podios de cada competencia.
        </p>
      </header>

      {/* Pesos */}
      <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs p-space-md flex flex-col gap-space-sm">
        <h2 className="font-label-lg text-label-lg text-on-surface font-bold uppercase tracking-wide">Ponderación</h2>
        <div className="flex flex-wrap gap-2">
          <WeightChip label="1.º lugar" value={config.first_place} />
          <WeightChip label="2.º lugar" value={config.second_place} />
          <WeightChip label="3.º lugar" value={config.third_place} />
          <WeightChip label="Participación" value={config.participation} />
          <WeightChip label="Victoria" value={config.victory} />
        </div>
      </section>

      {/* Tabla */}
      <section className="flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold px-1">Tabla por iglesia</h2>
        {standings.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-space-md text-body-sm text-body-sm text-on-surface-variant">
            Aún no hay iglesias con puntos. Registra resultados para que se acumulen.
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {standings.map((s, i) => (
              <StandingRow key={s.church_id} standing={s} rank={i + 1} />
            ))}
          </ol>
        )}
      </section>

      {/* Podios */}
      {podios.length > 0 && (
        <section className="flex flex-col gap-space-xs">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold px-1">Podios por competencia</h2>
          <div className="flex flex-col gap-space-sm">
            {podios.map((p) => (
              <div
                key={p.competition_id}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs p-space-md flex flex-col gap-space-sm"
              >
                <h3 className="font-label-lg text-label-lg text-on-surface font-bold">{p.competition_name}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <PodiumSlot place="🥇" value={p.champion} label="1.º" />
                  <PodiumSlot place="🥈" value={p.runner_up} label="2.º" />
                  <PodiumSlot place="🥉" value={p.third[0] ?? p.third[1] ?? null} label="3.º" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function WeightChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-badge text-label-badge font-bold">
      {label} · {value} pts
    </span>
  )
}

function StandingRow({ standing, rank }: { standing: ChurchStanding; rank: number }) {
  const topThree = rank <= 3
  return (
    <li
      className={`rounded-xl border p-3 flex items-center gap-3 transition-transform active:scale-[0.99] ${
        topThree
          ? 'bg-primary/5 border-primary/30 shadow-sm'
          : 'bg-surface-container-lowest border-outline-variant/30 shadow-xs'
      }`}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center font-label-lg text-label-lg font-extrabold flex-shrink-0 ${
          rank === 1
            ? 'bg-amber-400 text-amber-950'
            : rank === 2
              ? 'bg-slate-300 text-slate-900'
              : rank === 3
                ? 'bg-orange-400 text-orange-950'
                : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        {rank}
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="font-label-lg text-label-lg text-on-surface font-bold truncate flex items-center gap-1.5">
          {standing.church_name}
          <MedalGroup standing={standing} />
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
          {standing.victories} victorias · {standing.participations} participaciones
        </span>
      </span>
      <span className="text-right flex-shrink-0">
        <span className="font-score-display text-[22px] text-on-surface leading-none block font-extrabold">
          {standing.total_points}
        </span>
        <span className="font-label-sm text-[11px] text-on-surface-variant uppercase block font-bold">pts</span>
      </span>
    </li>
  )
}

function MedalGroup({ standing }: { standing: ChurchStanding }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {standing.gold > 0 && <MedalDot color={MEDAL_DOT.gold} count={standing.gold} label="oro" />}
      {standing.silver > 0 && <MedalDot color={MEDAL_DOT.silver} count={standing.silver} label="plata" />}
      {standing.bronze > 0 && <MedalDot color={MEDAL_DOT.bronze} count={standing.bronze} label="bronce" />}
    </span>
  )
}

function MedalDot({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span title={`${count} ${label}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} border border-black/10`} />
      <span className="font-label-sm text-[10px] text-on-surface-variant font-bold">{count}</span>
    </span>
  )
}

function PodiumSlot({ place, value, label }: { place: string; value: string | null; label: string }) {
  return (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[18px]">{place}</span>
      <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">{label}</span>
      <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{value ?? '—'}</span>
    </span>
  )
}