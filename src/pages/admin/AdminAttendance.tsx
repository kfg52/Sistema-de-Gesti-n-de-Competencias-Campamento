import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  checkInRegistration,
  checkInRegistrationsForParticipant,
  getAccreditationSummary,
  getRegistrationsByParticipant,
  updateRegistrationStatus,
} from '@/services/registrations'
import {
  getParticipantByCode,
  getParticipantByToken,
  searchParticipants,
} from '@/services/participants'
import { getActiveCompetitionsWithStats } from '@/services/competitions'
import { getChurches } from '@/services/churches'
import { useToast } from '@/components/ui/Toast'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { QRScanner } from '@/components/QRScanner'
import type {
  AccreditationSummary,
  Church,
  CompetitionWithStats,
  ParticipantWithChurch,
  RegistrationStatus,
  RegistrationWithDetails,
} from '@/types'

const EMPTY_SUMMARY: AccreditationSummary = {
  totalRegistrations: 0,
  activeRegistrations: 0,
  checkedInRegistrations: 0,
  pendingRegistrations: 0,
  uniqueParticipants: 0,
  checkedInParticipants: 0,
  attendancePct: 0,
}

const formatTime = (iso?: string | null): string => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}

export function AdminAttendance() {
  const { toast } = useToast()

  // Resumen en vivo y filtros
  const [summary, setSummary] = useState<AccreditationSummary>(EMPTY_SUMMARY)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [churches, setChurches] = useState<Church[]>([])
  const [competitions, setCompetitions] = useState<CompetitionWithStats[]>([])
  const [churchFilter, setChurchFilter] = useState('')
  const [competitionFilter, setCompetitionFilter] = useState('')
  const summarySeqRef = useRef(0)

  // Búsqueda y participante activo
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<ParticipantWithChurch[]>([])
  const [activeParticipant, setActiveParticipant] = useState<ParticipantWithChurch | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [regsLoading, setRegsLoading] = useState(false)
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [busyAll, setBusyAll] = useState(false)
  const [recentCheckedIn, setRecentCheckedIn] = useState<ParticipantWithChurch[]>([])

  // Escáner QR
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const refreshSummary = useCallback(async () => {
    const seq = ++summarySeqRef.current
    setSummaryLoading(true)
    try {
      const data = await getAccreditationSummary({
        competitionId: competitionFilter || undefined,
        churchId: churchFilter || undefined,
      })
      if (seq !== summarySeqRef.current) return
      setSummary(data)
    } catch {
      if (seq !== summarySeqRef.current) return
      toast('No pudimos cargar el resumen de asistencia.', 'error')
    } finally {
      if (seq === summarySeqRef.current) setSummaryLoading(false)
    }
  }, [churchFilter, competitionFilter, toast])

  useEffect(() => {
    void Promise.all([getChurches(), getActiveCompetitionsWithStats()])
      .then(([churchRows, compRows]) => {
        setChurches(churchRows)
        setCompetitions(compRows)
      })
      .catch(() => {
        toast('No pudimos cargar los filtros de iglesia y competencia.', 'error')
      })
    void refreshSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pushRecent = (p: ParticipantWithChurch) => {
    setRecentCheckedIn((prev) => [p, ...prev.filter((x) => x.id !== p.id)].slice(0, 5))
  }

  const vibrate = (pattern: number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(pattern)
    }
  }

  const loadParticipantRegistrations = async (participantId: string) => {
    setRegsLoading(true)
    try {
      const rows = await getRegistrationsByParticipant(participantId)
      setRegistrations(rows)
    } catch {
      toast('No pudimos cargar las inscripciones de este participante.', 'error')
    } finally {
      setRegsLoading(false)
    }
  }

  const selectParticipant = async (p: ParticipantWithChurch) => {
    setActiveParticipant(p)
    setResults([])
    setCameraError(null)
    await loadParticipantRegistrations(p.id)
    toast(`Atleta identificado: ${p.first_name} ${p.last_name}`)
    vibrate([40, 30, 40])
  }

  // Resolver búsqueda: URL de QR, código CMP-#####, token hex, o nombre/apellido
  const resolveSearch = async (raw: string) => {
    const query = raw.trim()
    if (!query) return
    setIsSearching(true)
    setCameraActive(false)
    setCameraError(null)
    try {
      let candidates: ParticipantWithChurch[] = []

      if (query.includes('?t=')) {
        let token = ''
        try {
          token = new URL(query).searchParams.get('t') ?? ''
        } catch {
          /* no es URL completa */
        }
        if (!token) {
          const match = query.match(/[?&]t=([a-f0-9]+)/i)
          token = match?.[1] ?? ''
        }
        if (token) {
          const p = await getParticipantByToken(token)
          if (p) candidates = [p]
        }
      } else if (/^CMP-\d+$/i.test(query)) {
        const p = await getParticipantByCode(query.toUpperCase())
        if (p) candidates = [p]
      } else if (/^[a-f0-9]{36}$/i.test(query)) {
        const p = await getParticipantByToken(query)
        if (p) candidates = [p]
      }

      if (candidates.length === 0) {
        candidates = await searchParticipants({ search: query })
        if (candidates.length > 12) candidates = candidates.slice(0, 12)
      }

      setResults(candidates)
      if (candidates.length === 1) {
        await selectParticipant(candidates[0])
      } else if (candidates.length === 0) {
        toast('No se encontró ningún atleta con ese dato.', 'error')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al buscar atleta.', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  // Check-in individual (por disciplina)
  const handleCheckInOne = async (reg: RegistrationWithDetails) => {
    if (!activeParticipant) return
    setBusyIds((prev) => ({ ...prev, [reg.id]: true }))
    try {
      const updated = await checkInRegistration(reg.id)
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === updated.id ? { ...r, checked_in_at: updated.checked_in_at } : r,
        ),
      )
      pushRecent(activeParticipant)
      await refreshSummary()
      toast(
        `Acreditado en ${reg.competition?.name ?? 'disciplina'} — ${formatTime(updated.checked_in_at)}`,
        'success',
      )
      vibrate([80, 50, 80])
    } catch (err) {
      await refreshSummary()
      toast(err instanceof Error ? err.message : 'No se pudo registrar el check-in.', 'error')
    } finally {
      setBusyIds((prev) => {
        const next = { ...prev }
        delete next[reg.id]
        return next
      })
    }
  }

  // Check-in masivo del participante en todas sus disciplinas pendientes
  const handleConfirmAll = async () => {
    if (!activeParticipant) return
    setBusyAll(true)
    try {
      const count = await checkInRegistrationsForParticipant(activeParticipant.id)
      await loadParticipantRegistrations(activeParticipant.id)
      await refreshSummary()
      if (count > 0) {
        pushRecent(activeParticipant)
        toast(
          `${activeParticipant.first_name} acreditado en ${count} ${count === 1 ? 'disciplina' : 'disciplinas'} — ${formatTime(new Date().toISOString())}`,
          'success',
        )
        vibrate([80, 50, 80])
      }
    } catch (err) {
      await refreshSummary()
      toast(err instanceof Error ? err.message : 'No se pudo acreditar al atleta.', 'error')
    } finally {
      setBusyAll(false)
    }
  }

  const handleToggleStatus = async (reg: RegistrationWithDetails, status: RegistrationStatus) => {
    if (!activeParticipant) return
    try {
      await updateRegistrationStatus(reg.id, status)
      await loadParticipantRegistrations(activeParticipant.id)
      await refreshSummary()
      toast(
        status === 'CANCELLED'
          ? `${reg.competition?.name ?? 'Disciplina'} retirada.`
          : `${reg.competition?.name ?? 'Disciplina'} reactivada.`,
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo actualizar la inscripción.', 'error')
    }
  }

  const handleNext = () => {
    setActiveParticipant(null)
    setRegistrations([])
    setResults([])
    setSearchInput('')
    setCameraError(null)
  }

  // Estado derivado del participante activo
  const activePending = useMemo(
    () => registrations.filter((r) => r.status !== 'CANCELLED' && !r.checked_in_at),
    [registrations],
  )
  const activeChecked = useMemo(
    () => registrations.filter((r) => r.checked_in_at),
    [registrations],
  )
  const globalState: 'acreditado' | 'parcial' | 'pendiente' | 'ninguno' =
    registrations.length === 0
      ? 'ninguno'
      : activePending.length === 0
        ? 'acreditado'
        : activeChecked.length > 0
          ? 'parcial'
          : 'pendiente'

  const summaryPct =
    summary.uniqueParticipants > 0
      ? Math.round((summary.checkedInParticipants / summary.uniqueParticipants) * 100)
      : 0

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      {/* Encabezado */}
      <div className="flex items-center justify-between px-1 pt-space-sm">
        <div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Mesa de Acreditación
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Check-in por disciplina (asistencia), escaneo QR y verificación
          </p>
        </div>
        <Link
          to="/admin"
          className="h-9 px-3 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver
        </Link>
      </div>

      {/* Filtros + Resumen */}
      <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md shadow-xs flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row gap-space-xs">
          <label className="flex flex-col gap-1 flex-1">
            <span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase">
              Iglesias
            </span>
            <select
              value={churchFilter}
              onChange={(e) => setChurchFilter(e.target.value)}
              className="h-10 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            >
              <option value="">Todas las iglesias</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase">
              Competencias
            </span>
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="h-10 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            >
              <option value="">Todas las competencias</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-space-xs">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-space-sm flex flex-col">
            <span className="font-body-sm text-[12px] text-emerald-800 dark:text-emerald-300">
              Atletas acreditados
            </span>
            <span className="font-headline-md text-headline-md font-bold text-emerald-700 dark:text-emerald-400">
              {summaryLoading ? '…' : summary.checkedInParticipants}
            </span>
            <span className="font-label-sm text-[11px] text-emerald-600 dark:text-emerald-400">
              de {summaryLoading ? '…' : summary.uniqueParticipants} inscritos
            </span>
          </div>
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-sm flex flex-col">
            <span className="font-body-sm text-[12px] text-on-surface-variant">Check-ins</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              {summaryLoading ? '…' : summary.checkedInRegistrations}
            </span>
            <span className="font-label-sm text-[11px] text-on-surface-variant">
              de {summaryLoading ? '…' : summary.activeRegistrations} inscripciones
            </span>
          </div>
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-sm flex flex-col">
            <span className="font-body-sm text-[12px] text-on-surface-variant">Pendientes</span>
            <span className="font-headline-md text-headline-md font-bold text-amber-600 dark:text-amber-300">
              {summaryLoading ? '…' : summary.pendingRegistrations}
            </span>
            <span className="font-label-sm text-[11px] text-on-surface-variant">
              sin confirmar
            </span>
          </div>
        </div>

        <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${summaryLoading ? 0 : summaryPct}%` }}
          />
        </div>
      </section>

      {/* Módulo de Búsqueda y Escáner */}
      <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="font-headline-sm text-[16px] text-on-surface font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">qr_code_scanner</span>
            Identificar Atleta
          </h2>
          <button
            type="button"
            onClick={() => {
              if (cameraActive) {
                setCameraActive(false)
              } else {
                setCameraError(null)
                setCameraActive(true)
              }
            }}
            className={`h-10 px-3 rounded-lg font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
              cameraActive ? 'bg-error text-on-error' : 'bg-primary text-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {cameraActive ? 'videocam_off' : 'photo_camera'}
            </span>
            <span>{cameraActive ? 'Detener cámara' : 'Escanear QR'}</span>
          </button>
        </div>

        <QRScanner
          active={cameraActive}
          onDecode={(text) => {
            setSearchInput(text)
            void resolveSearch(text)
          }}
          onError={(msg) => {
            setCameraError(msg)
            setCameraActive(false)
          }}
        />

        {cameraError ? (
          <p className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-body-sm text-body-sm">
            {cameraError}
          </p>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void resolveSearch(searchInput)
          }}
          className="flex gap-space-xs"
        >
          <div className="relative flex-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
              badge
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value
                setSearchInput(val)
                if (val.includes('?t=') || /^CMP-\d{3,}$/i.test(val)) {
                  void resolveSearch(val)
                }
              }}
              placeholder="Escribir CMP-00001, nombre, apellido o pegar el QR…"
              className="w-full h-12 pl-10 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchInput.trim()}
            className="h-12 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSearching ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">search</span>
                Buscar
              </>
            )}
          </button>
        </form>
      </section>

      {/* Resultados múltiples para elegir */}
      {results.length > 1 ? (
        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-space-md shadow-sm flex flex-col gap-space-xs">
          <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">
            {results.length} coincidencias — selecciona al atleta
          </h3>
          <div className="flex flex-col gap-1.5">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isSearching}
                onClick={() => void selectParticipant(p)}
                className="w-full flex items-center gap-space-sm p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-left disabled:opacity-50"
              >
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-label-md font-extrabold flex-shrink-0">
                  {p.first_name.charAt(0)}
                  {p.last_name.charAt(0)}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant truncate">
                    {p.participant_code} · {p.church?.name ?? 'Iglesia no especificada'}
                  </span>
                </span>
                <span className="material-symbols-outlined text-on-surface-variant ml-auto flex-shrink-0 text-[18px]">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Ficha del Atleta Activo */}
      {activeParticipant ? (
        <section className="rounded-xl bg-surface-container-lowest border-2 border-primary/30 p-space-md shadow-md flex flex-col gap-space-md animate-fadeIn">
          {/* Cabecera del Atleta */}
          <div className="flex items-start justify-between gap-space-sm flex-wrap">
            <div className="flex items-center gap-space-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-idp-navy text-on-primary flex items-center justify-center font-headline-md text-[20px] font-extrabold shadow-sm">
                {activeParticipant.first_name.charAt(0)}
                {activeParticipant.last_name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
                    {activeParticipant.first_name} {activeParticipant.last_name}
                  </h3>
                  <span className="font-label-badge text-label-badge font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
                    {activeParticipant.participant_code}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">church</span>
                  {activeParticipant.church?.name ?? 'Iglesia no especificada'}
                </p>
              </div>
            </div>

            {/* Badge de estado global de asistencia */}
            <div>
              {globalState === 'acreditado' ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-label-md text-label-md font-bold flex items-center gap-1.5 border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  ACREDITADO
                </span>
              ) : globalState === 'parcial' ? (
                <span className="px-3 py-1 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-300 font-label-md text-label-md font-bold flex items-center gap-1.5 border border-orange-500/30">
                  <span className="material-symbols-outlined text-[18px]">pending</span>
                  PARCIAL
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-label-md text-label-md font-bold flex items-center gap-1.5 border border-amber-500/30">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  PENDIENTE
                </span>
              )}
            </div>
          </div>

          {/* Acción rápida de check-in para todas las disciplinas pendientes */}
          {activePending.length > 0 ? (
            <button
              type="button"
              disabled={busyAll}
              onClick={() => void handleConfirmAll()}
              className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-label-lg text-[16px] font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {busyAll ? (
                <span className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
                  CONFIRMAR ASISTENCIA ({activePending.length}{' '}
                  {activePending.length === 1 ? 'DISCIPLINA' : 'DISCIPLINAS'})
                </>
              )}
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Este atleta ya está acreditado en todas sus disciplinas.</span>
            </div>
          )}

          {/* Lista de disciplinas con check-in por fila */}
          <div className="flex flex-col gap-space-xs">
            <h4 className="font-label-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider px-1">
              Disciplinas Registradas ({registrations.length}) · {activeChecked.length} acreditadas
            </h4>

            {regsLoading ? (
              <LoadingState label="Cargando disciplinas…" rows={2} />
            ) : registrations.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant p-space-sm bg-surface-container-low rounded-lg">
                No tiene disciplinas registradas actualmente.
              </p>
            ) : (
              <div className="flex flex-col gap-space-xs">
                {registrations.map((reg) => {
                  const compName = reg.competition?.name ?? 'Competencia'
                  const isCancelled = reg.status === 'CANCELLED'
                  const checkedIn = Boolean(reg.checked_in_at)
                  return (
                    <div
                      key={reg.id}
                      className="rounded-lg bg-surface-container-low border border-outline-variant/30 p-space-sm flex items-center justify-between gap-space-sm"
                    >
                      <div className="flex items-center gap-space-xs min-w-0">
                        <span className="material-symbols-outlined text-primary text-[20px]">sports</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {compName}
                          </span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            {reg.competition?.tipo === 'TEAM' ? 'Por equipos' : 'Individual'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={reg.status} kind="registration" />

                        {isCancelled ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(reg, 'REGISTERED')}
                            className="h-8 px-2.5 rounded-md bg-surface-container-high text-on-surface-variant text-body-sm text-[12px] font-semibold transition-colors"
                            title="Reactivar inscripción"
                          >
                            Reactivar
                          </button>
                        ) : checkedIn ? (
                          <span className="h-8 px-2.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-body-sm text-[12px] font-bold flex items-center gap-1 border border-emerald-500/30">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            {formatTime(reg.checked_in_at)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyIds[reg.id]}
                            onClick={() => void handleCheckInOne(reg)}
                            className="h-8 px-2.5 rounded-md bg-emerald-600 text-white text-body-sm text-[12px] font-bold shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-1"
                          >
                            {busyIds[reg.id] ? (
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            ) : (
                              <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
                            )}
                            Confirmar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(reg, 'CANCELLED')}
                          className="h-8 px-2.5 rounded-md bg-surface-container-high text-on-surface-variant hover:text-error text-body-sm text-[12px] font-semibold transition-colors"
                          title="Retirar inscripción"
                        >
                          Retirar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Siguiente participante */}
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-12 rounded-xl border-2 border-primary/30 text-primary font-label-lg text-label-lg font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">skip_next</span>
            Siguiente participante
          </button>
        </section>
      ) : (
        <EmptyState
          title="Ningún atleta seleccionado"
          description="Escanea un carnet QR, carga una foto del QR o busca por código CMP-#####, nombre o apellido."
        />
      )}

      {/* Atletas recientemente acreditados */}
      {recentCheckedIn.length > 0 ? (
        <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md shadow-xs flex flex-col gap-space-xs mt-space-xs">
          <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">
            Recién Acreditados en esta sesión
          </h3>
          <div className="flex flex-col gap-1.5">
            {recentCheckedIn.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void selectParticipant(p)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">
                    {p.participant_code}
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}