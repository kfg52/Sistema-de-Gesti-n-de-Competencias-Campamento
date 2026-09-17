import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useParticipant } from '@/hooks/useParticipant'
import { getRegistrationsByParticipant } from '@/services/registrations'
import { getTeamsByParticipant } from '@/services/teams'
import { getParticipantByCode } from '@/services/participants'
import { useToast } from '@/components/ui/Toast'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ParticipantWithChurch, RegistrationWithDetails } from '@/types'
import { cn } from '@/lib/utils'

export function MyCompetitions() {
  const { participant: qrParticipant, loading } = useParticipant()
  const [lookupParticipant, setLookupParticipant] = useState<ParticipantWithChurch | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [myTeams, setMyTeams] = useState<Record<string, string>>({})
  const [dataLoading, setDataLoading] = useState(false)
  const { toast } = useToast()

  const participant = qrParticipant ?? lookupParticipant

  useEffect(() => {
    let active = true
    if (!participant) {
      setRegistrations([])
      setMyTeams({})
      return
    }
    setDataLoading(true)
    ;(async () => {
      try {
        const [regs, teams] = await Promise.all([
          getRegistrationsByParticipant(participant.id),
          getTeamsByParticipant(participant.id),
        ])
        if (!active) return
        setRegistrations(regs)
        const map: Record<string, string> = {}
        for (const t of teams) {
          if (t.competition_name) map[t.competition_name] = t.name
        }
        setMyTeams(map)
      } catch {
        if (active) {
          setRegistrations([])
          toast('No pudimos cargar tus competencias.', 'error')
        }
      } finally {
        if (active) setDataLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [participant, toast])

  const qrValue = useMemo(() => {
    if (!participant) return ''
    const base = `${window.location.origin}/mis-competencias?t=${participant.participant_token}`
    return base
  }, [participant])

  const lookupByCode = async () => {
    const code = codeInput.trim()
    if (!code) {
      toast('Escribe tu código de participante.', 'error')
      return
    }
    setSearching(true)
    try {
      const found = await getParticipantByCode(code)
      if (found) {
        setLookupParticipant(found)
        localStorage.setItem('idp_participant_token', found.participant_token)
      } else {
        toast('No encontramos un participante con ese código.', 'error')
      }
    } catch {
      toast('No pudimos buscar el código. Intenta nuevamente.', 'error')
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <LoadingState label="Identificando participante..." rows={3} />

  if (!participant) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md flex flex-col gap-space-sm shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">qr_code_scanner</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Encuentra tu código
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Para ver tus competencias escribe el código de tu carnet (ej. CMP-00001) o escanea tu QR.
          </p>
          <div className="flex gap-space-sm">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="CMP-00001"
              className="flex-1 h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:ring-1 focus:ring-primary-container outline-none shadow-inner border border-transparent focus:border-primary-container uppercase"
            />
            <button
              type="button"
              disabled={searching}
              onClick={lookupByCode}
              className="h-11 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              {searching ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">search</span>
              )}
              <span>Buscar</span>
            </button>
          </div>
        </section>

        <EmptyState
          icon="sports_score"
          title="Aún no te has inscrito"
          description="Regístrate para ver tus competencias, equipos y resultados."
          action={
            <Link
              to="/registro"
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold"
            >
              Inscribirme ahora
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full pb-space-lg gap-space-sm">
      {qrParticipant ? (
        <div className="px-gutter pt-space-sm pb-space-xs">
          <div className="bg-surface-container-lowest shadow-sm border border-outline-variant/40 rounded-xl p-space-md flex items-center justify-between gap-space-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container" />
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight truncate">
                  ¡Identificado correctamente!
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {participant.first_name} {participant.last_name} · {participant.participant_code}
                </span>
              </div>
            </div>
            <span className="bg-primary/10 text-primary border border-primary/20 font-label-sm text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 flex-shrink-0 font-bold">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
              OFICIAL IDP
            </span>
          </div>
        </div>
      ) : null}

      {/* Carnet */}
      <div className="px-gutter py-space-sm">
        <div className="relative bg-surface-container-lowest shadow-xl rounded-2xl overflow-hidden border border-outline-variant/30">
          <div className="h-28 bg-gradient-to-r from-idp-navy via-[#1e3474] to-primary p-space-md flex justify-between items-start text-white relative">
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shadow-inner">
                <img
                  alt="Emblema IDP"
                  className="h-full w-auto object-contain"
                  src="/images/iglesia-de-dios-de-la-profecia-logo.png"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-tertiary-fixed font-bold tracking-widest uppercase">
                  Carnet Oficial de Atleta
                </span>
                <span className="font-headline-sm text-[18px] text-white font-extrabold tracking-tight">
                  IDP VARONES 2026
                </span>
              </div>
            </div>
            <div className="z-10">
              <StatusBadge status="ACTIVE" kind="registration" />
            </div>
          </div>

          <div className="px-space-md pt-0 pb-space-md relative -mt-8">
            <div className="flex items-end justify-between">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-idp-navy text-on-primary flex items-center justify-center font-headline-md text-headline-md font-extrabold shadow-lg border-2 border-white">
                {participant.first_name.charAt(0)}
                {participant.last_name.charAt(0)}
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
                  Registro General
                </span>
                <span className="font-headline-md text-headline-md text-primary font-extrabold tracking-tight">
                  {participant.participant_code}
                </span>
              </div>
            </div>

            <div className="mt-space-sm">
              <h2 className="font-headline-lg text-[22px] font-bold text-on-surface">
                {participant.first_name} {participant.last_name}
              </h2>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm mt-0.5 font-medium">
                <span className="material-symbols-outlined text-[16px] text-secondary">church</span>
                <span className="text-secondary font-semibold">{participant.church?.name ?? 'IDP'}</span>
              </div>
            </div>

            <div className="my-space-md flex items-center justify-between gap-2">
              <div className="w-3.5 h-7 bg-surface rounded-r-full -ml-space-md border-r border-outline-variant/30" />
              <div className="flex-1 border-t-2 border-dashed border-outline-variant/60" />
              <div className="w-3.5 h-7 bg-surface rounded-l-full -mr-space-md border-l border-outline-variant/30" />
            </div>

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-space-md flex flex-col items-center gap-space-sm">
              <div className="flex flex-col text-center">
                <span className="font-headline-sm text-[16px] text-on-surface font-bold">
                  Tu código QR
                </span>
                <span className="font-body-sm text-[13px] text-on-surface-variant max-w-[240px] leading-snug">
                  Preséntalo en mesa antes de cada encuentro para validar tu asistencia.
                </span>
              </div>
              <div className="p-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-sm">
                <QRCodeSVG value={qrValue} size={112} level="M" />
                <span className="font-mono text-[9px] text-on-surface-variant font-bold mt-1 tracking-wider block text-center">
                  {participant.participant_code}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-gutter py-space-xs">
        <div className="grid grid-cols-3 gap-space-xs bg-surface-container-low p-2 rounded-xl border border-outline-variant/30">
          <MiniStat value={String(registrations.length)} label="Torneos" />
          <MiniStat value={String(Object.keys(myTeams).length)} label="Equipos" />
          <MiniStat value="—" label="Rondas Pasadas" />
        </div>
      </div>

      {/* Mis competencias */}
      <div className="px-gutter pt-space-md pb-space-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary-container rounded-full" />
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Mis Competencias Registradas
          </h3>
        </div>
        <span className="font-label-sm text-[11px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
          {registrations.length} DISCIPLINAS
        </span>
      </div>

      {dataLoading ? (
        <LoadingState label="Cargando tus competencias..." rows={2} />
      ) : registrations.length > 0 ? (
        <div className="px-gutter flex flex-col gap-space-md pb-space-md">
          {registrations.map((reg) => {
            const teamName = reg.competition?.name ? myTeams[reg.competition.name] : undefined
            return (
              <Link
                key={reg.id}
                to={reg.competition ? `/competencia/${reg.competition.id}` : '/competencias'}
                className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden transition-transform active:scale-[0.98]"
              >
                <div className="bg-surface-container-low px-space-md py-2.5 flex items-center justify-between border-b border-outline-variant/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">sports</span>
                    <span className="font-headline-sm text-[15px] text-on-surface font-bold truncate">
                      {reg.competition?.name ?? 'Competencia'}
                    </span>
                  </div>
                  <StatusBadge status={reg.status} kind="registration" />
                </div>
                <div className="p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-sm text-on-primary',
                          teamName ? 'bg-secondary' : 'bg-surface-container-high text-secondary',
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {teamName ? 'groups' : 'person'}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-lg text-label-lg text-on-surface block leading-tight font-bold">
                          {teamName ?? 'Modalidad individual'}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {reg.competition?.tipo === 'TEAM'
                            ? `${reg.competition.jugadores_por_equipo} por equipo`
                            : 'Competencia individual'}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="sports_score"
          title="Sin competencias registradas"
          description="Inscríbete en una competencia para que aparezca aquí."
          action={
            <Link
              to="/registro"
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold"
            >
              Inscribirme
            </Link>
          }
        />
      )}
    </div>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface-container-lowest p-space-sm rounded-lg text-center shadow-sm">
      <span className="font-score-display text-[20px] text-primary leading-none block font-extrabold">
        {value}
      </span>
      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-tight mt-1 block font-bold">
        {label}
      </span>
    </div>
  )
}