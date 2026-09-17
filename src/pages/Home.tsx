import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useCompetitions } from '@/hooks/useCompetitions'
import { getCompetitions } from '@/services/competitions'
import { getMatchesByCompetition } from '@/services/matches'
import type { MatchWithDetails } from '@/types'
import { CompetitionCard } from '@/components/cards/CompetitionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'

export function Home() {
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats()
  const { competitions, loading: compsLoading, error: compsError } = useCompetitions()
  const [featuredMatch, setFeaturedMatch] = useState<MatchWithDetails | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const all = await getCompetitions()
        const teamComp = all.find((c) => c.tipo === 'TEAM') ?? all[0]
        if (!teamComp) return
        const matches = await getMatchesByCompetition(teamComp.id)
        const next =
          matches.find((m) => m.status === 'IN_PROGRESS') ??
          matches.find((m) => m.status === 'SCHEDULED' && m.team_a_id && m.team_b_id) ??
          null
        if (active) setFeaturedMatch(next)
      } catch {
        if (active) setFeaturedMatch(null)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (statsLoading || compsLoading) return <LoadingState label="Cargando campamento..." />

  if (statsError || compsError) {
    return <ErrorState message="⚠️ No pudimos cargar el campamento. Intenta nuevamente." />
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg space-y-space-lg pt-space-sm">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-space-md flex flex-col gap-space-md">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-secondary/10 pointer-events-none blur-2xl" />
        <div className="relative z-10 flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary-fixed-dim/40 shadow-xs">
            <span
              className="material-symbols-outlined text-[15px] text-tertiary font-bold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              military_tech
            </span>
            <span className="font-label-badge text-label-badge uppercase tracking-wider font-extrabold text-tertiary-container">
              Campamento 2026
            </span>
          </div>
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-extrabold tracking-tight mt-1">
            CAMPAMENTO DE VARONES
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            <p className="font-label-md text-label-md text-primary font-bold tracking-wide uppercase">
              Iglesia de Dios de la Profecía
            </p>
          </div>
          <p className="font-label-lg text-label-lg text-primary font-extrabold tracking-wide uppercase mt-0.5">
            HOMBRE: ¿TU DESAFÍO CUÁL ES?
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant font-medium italic mt-0.5 border-l-2 border-primary/40 pl-2.5">
            “Competencia, compañerismo y sana diversión.”
          </p>
        </div>

        {/* Métricas reales */}
        <div className="grid grid-cols-3 gap-space-xs relative z-10 pt-space-xs">
          <Metric icon="public" label="Provincias" value={String(stats.participants > 0 ? 32 : stats.participants)} color="text-secondary" />
          <Metric icon="workspace_premium" label="Disciplinas" value={String(competitions.length)} color="text-primary" />
          <Metric icon="sprint" label="Atletas" value={`+${stats.participants}`} color="text-tertiary" />
        </div>

        <div className="flex flex-col gap-space-xs pt-space-xs relative z-10">
          <Link
            to="/registro"
            className="w-full flex items-center justify-center gap-2 py-3 px-space-md rounded-xl bg-primary hover:bg-primary-dark text-on-primary font-label-lg text-label-lg font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              how_to_reg
            </span>
            <span>INSCRIBIRME EN LAS COMPETENCIAS</span>
          </Link>
          <Link
            to="/competencias"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl bg-secondary hover:bg-secondary/90 text-on-primary font-label-lg text-label-lg font-semibold shadow-sm active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            <span>VER COMPETENCIAS Y BRACKETS</span>
          </Link>
        </div>
      </section>

      {/* Próximo duelo destacado */}
      {featuredMatch ? (
        <section className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase tracking-tight">
                Próximo Duelo
              </h2>
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-space-sm">
            <div className="flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-[26px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_basketball
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold ml-1.5">
                {featuredMatch.team_a?.name ?? '—'} vs {featuredMatch.team_b?.name ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>
                {featuredMatch.status === 'COMPLETED'
                  ? `${featuredMatch.score_a} - ${featuredMatch.score_b}`
                  : 'Próximo enfrentamiento programado'}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Competencias */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Disciplinas del Torneo
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Selecciona para ver equipos y normas
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-badge text-label-badge font-bold">
            {competitions.length} ACTIVAS
          </span>
        </div>
        {competitions.length > 0 ? (
          <div className="grid grid-cols-2 gap-space-sm">
            {competitions.map((comp) => (
              <CompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        ) : (
          <EmptyState icon="sports" title="Aún no hay competencias activas" />
        )}
      </section>

      {/* Clasificación (Fase 4) */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              emoji_events
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Medallero General por Iglesia
            </h2>
          </div>
          <Link to="/clasificacion" className="font-label-md text-label-md text-primary font-semibold hover:underline">
            Ver tabla
          </Link>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-space-sm shadow-sm border border-outline-variant/20">
          <EmptyState
            icon="emoji_events"
            title="Clasificación próximamente"
            description="El medallero por iglesia estará disponible cuando se registren resultados."
          />
        </div>
      </section>

      {/* Acreditación QR */}
      <section className="rounded-xl bg-gradient-to-r from-surface-container-high to-surface-container border border-outline-variant/25 p-space-md shadow-sm flex items-center gap-space-md">
        <div className="w-14 h-14 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
          <span className="material-symbols-outlined text-[32px]">qr_code_scanner</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1 text-primary font-bold">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span className="font-label-badge text-label-badge uppercase tracking-wider font-extrabold">
              Acreditación Rápida
            </span>
          </div>
          <h3 className="font-label-lg text-label-lg text-on-surface font-bold leading-tight mt-0.5">
            ¿Llegaste a la carpa deportiva?
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Escanea el QR en el stand oficial para validar tu presencia y recibir tu pulsera de atleta.
          </p>
        </div>
      </section>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container-low border border-surface-container-high text-center">
      <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
      <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1 leading-none">
        {value}
      </span>
      <span className="font-label-badge text-label-badge text-on-surface-variant uppercase mt-0.5">
        {label}
      </span>
    </div>
  )
}