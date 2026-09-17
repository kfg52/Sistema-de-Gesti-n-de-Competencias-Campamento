import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { COMPETITION_TYPE_LABEL } from '@/lib/constants'
import type { Church, Competition } from '@/types'
import { cn } from '@/lib/utils'

type SectionKey = 'churches' | 'competitions' | 'participants' | 'teams'

interface SectionState {
  status: 'loading' | 'ok' | 'error'
  detail?: string
}

const initialState: Record<SectionKey, SectionState> = {
  churches: { status: 'loading' },
  competitions: { status: 'loading' },
  participants: { status: 'loading' },
  teams: { status: 'loading' },
}

const SECTION_LABEL: Record<SectionKey, string> = {
  churches: 'public.churches',
  competitions: 'public.competitions',
  participants: 'public.participants',
  teams: 'public.teams',
}

export function ConnectionTest() {
  const [churches, setChurches] = useState<Church[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [participantCount, setParticipantCount] = useState<number | null>(null)
  const [teamCount, setTeamCount] = useState<number | null>(null)
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(initialState)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let current = true
    const mark = (key: SectionKey, state: SectionState) => {
      if (current) setSections((prev) => ({ ...prev, [key]: state }))
    }

    ;(async () => {
      // Iglesias
      try {
        const { data, error } = await supabase!.from('churches').select('id, name').order('name')
        if (error) throw error
        setChurches((data ?? []) as Church[])
        mark('churches', { status: 'ok', detail: `${data?.length ?? 0} filas` })
      } catch (e) {
        mark('churches', { status: 'error', detail: e instanceof Error ? e.message : String(e) })
      }

      // Competencias
      try {
        const { data, error } = await supabase!
          .from('competitions')
          .select('id, name, tipo, jugadores_por_equipo, permite_equipos, activa, estado')
          .order('name')
        if (error) throw error
        setCompetitions((data ?? []) as Competition[])
        mark('competitions', { status: 'ok', detail: `${data?.length ?? 0} filas` })
      } catch (e) {
        mark('competitions', { status: 'error', detail: e instanceof Error ? e.message : String(e) })
      }

      // Participantes (solo conteo)
      try {
        const { count, error } = await supabase!
          .from('participants')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        setParticipantCount(count)
        mark('participants', { status: 'ok', detail: count != null ? `${count} filas` : '0 filas' })
      } catch (e) {
        mark('participants', { status: 'error', detail: e instanceof Error ? e.message : String(e) })
      }

      // Equipos (solo conteo)
      try {
        const { count, error } = await supabase!
          .from('teams')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        setTeamCount(count)
        mark('teams', { status: 'ok', detail: count != null ? `${count} filas` : '0 filas' })
      } catch (e) {
        mark('teams', { status: 'error', detail: e instanceof Error ? e.message : String(e) })
      }
    })()

    return () => {
      current = false
    }
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <HeaderSection
          status="error"
          title="Supabase no está configurado"
          subtitle="La pantalla NO usa datos de demostración: requiere las claves reales para consultar."
        />
        <div className="rounded-xl border border-error/40 bg-error-container/40 p-space-md flex flex-col gap-space-xs shadow-sm">
          <p className="font-body-md text-body-md text-on-surface font-semibold">
            Para activar la conexión:
          </p>
          <ol className="list-decimal list-inside font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-1">
            <li>
              Abre <code className="font-mono text-[12px] bg-surface-container-high px-1.5 py-0.5 rounded">.env.local</code>{' '}
              en la raíz del proyecto.
            </li>
            <li>
              Pega tu <b>Project URL</b> en <code className="font-mono text-[12px]">VITE_SUPABASE_URL</code>.
            </li>
            <li>
              Pega tu <b>anon key</b> (o publishable key) en{' '}
              <code className="font-mono text-[12px]">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
            </li>
            <li>
              Reinicia <code className="font-mono text-[12px]">npm run dev</code> y recarga esta página.
            </li>
          </ol>
          <p className="font-body-sm text-body-sm text-error font-medium pt-space-xs">
            Nunca uses una service_role / secret key en el frontend.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Origen: <span className="font-mono text-[12px]">{window.location.origin}</span>
          </p>
        </div>
      </div>
    )
  }

  const summary = [
    { label: 'Iglesias', value: churches.length, ok: sections.churches.status === 'ok' },
    { label: 'Competencias', value: competitions.length, ok: sections.competitions.status === 'ok' },
    { label: 'Participantes', value: participantCount ?? 0, ok: sections.participants.status === 'ok' },
    { label: 'Equipos', value: teamCount ?? 0, ok: sections.teams.status === 'ok' },
  ]

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      <HeaderSection
        status="ok"
        title="Conexión a Supabase"
        subtitle={`Proyecto: ${import.meta.env.VITE_SUPABASE_URL ?? '—'}`}
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-space-xs">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md shadow-xs"
          >
            <span className="font-score-display text-[24px] text-primary leading-none block font-extrabold">
              {s.ok ? s.value : '—'}
            </span>
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-tight mt-1 block font-bold">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Detalle por tabla */}
      <div className="flex flex-col gap-space-sm">
        {(Object.keys(SECTION_LABEL) as SectionKey[]).map((key) => {
          const st = sections[key]
          return (
            <div
              key={key}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 overflow-hidden shadow-xs"
            >
              <div className="flex items-center justify-between px-space-md py-2.5 border-b border-outline-variant/20">
                <span className="font-mono text-[12px] text-on-surface font-bold">
                  {SECTION_LABEL[key]}
                </span>
                <StatusChip state={st} />
              </div>
              <div className="p-space-md">
                {st.status === 'error' ? (
                  <p className="font-body-sm text-body-sm text-error break-words">{st.detail}</p>
                ) : key === 'churches' && st.status === 'ok' ? (
                  <ul className="flex flex-col gap-1">
                    {churches.map((c) => (
                      <li key={c.id} className="font-body-sm text-body-sm text-on-surface-variant">
                        • {c.name}
                      </li>
                    ))}
                  </ul>
                ) : key === 'competitions' && st.status === 'ok' ? (
                  <ul className="flex flex-col gap-1">
                    {competitions.map((c) => (
                      <li
                        key={c.id}
                        className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-between gap-2"
                      >
                        <span className="truncate">• {c.name}</span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold">
                            {COMPETITION_TYPE_LABEL[c.tipo] ?? c.tipo}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold">
                            {c.jugadores_por_equipo} jug.
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {st.detail ?? 'Consultando…'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant px-1">
        Datos obtenidos directamente de <b>Supabase vía anon key</b>. No se creó, modificó ni omitió
        ninguna política RLS durante esta comprobación.
      </p>
    </div>
  )
}

function HeaderSection({
  status,
  title,
  subtitle,
}: {
  status: 'ok' | 'error'
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md flex items-center gap-space-sm shadow-sm">
      <span
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          status === 'ok' ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
        )}
      >
        <span className="material-symbols-outlined text-[22px]">
          {status === 'ok' ? 'cloud_done' : 'cloud_off'}
        </span>
      </span>
      <div className="flex flex-col min-w-0">
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">{title}</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{subtitle}</p>
      </div>
    </div>
  )
}

function StatusChip({ state }: { state: SectionState }) {
  if (state.status === 'loading') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
        <span className="w-3 h-3 rounded-full border-2 border-on-surface-variant/30 border-t-on-surface-variant animate-spin" />
        Consultando…
      </span>
    )
  }
  if (state.status === 'error') {
    return (
      <span className="px-2 py-1 rounded-full bg-error/15 text-error text-[11px] font-bold flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">error</span>
        Error
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-full bg-success/15 text-success text-[11px] font-bold flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">check_circle</span>
      OK {state.detail}
    </span>
  )
}