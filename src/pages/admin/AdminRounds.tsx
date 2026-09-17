import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getCompetitions } from '@/services/competitions'
import {
  createRound,
  deleteRound,
  generateRoundMatches,
  getRoundsByCompetition,
  updateRoundStatus,
} from '@/services/rounds'
import {
  createMatch,
  deleteMatch,
  getMatchesByCompetition,
  recordMatchResult,
} from '@/services/matches'
import { searchParticipants } from '@/services/participants'
import { getTeamsByCompetition } from '@/services/teams'
import { useToast } from '@/components/ui/Toast'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type {
  Competition,
  MatchWithDetails,
  Round,
  RoundStatus,
} from '@/types'

const ROUND_STATUS_OPTIONS: Array<{ value: RoundStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ACTIVE', label: 'En curso' },
  { value: 'COMPLETED', label: 'Completada' },
]

type Entity = { id: string; name: string }

function matchSideName(m: MatchWithDetails, side: 'a' | 'b'): string {
  if (side === 'a') {
    if (m.team_a) return m.team_a.name
    if (m.participant_a) return `${m.participant_a.first_name} ${m.participant_a.last_name}`
  } else {
    if (m.team_b) return m.team_b.name
    if (m.participant_b) return `${m.participant_b.first_name} ${m.participant_b.last_name}`
  }
  return 'Por definir'
}

function isWinner(m: MatchWithDetails, side: 'a' | 'b'): boolean {
  if (side === 'a') {
    return !!(
      (m.team_a && m.winner_team_id === m.team_a.id) ||
      (m.participant_a && m.winner_participant_id === m.participant_a.id)
    )
  }
  return !!(
    (m.team_b && m.winner_team_id === m.team_b.id) ||
    (m.participant_b && m.winner_participant_id === m.participant_b.id)
  )
}

export function AdminRounds() {
  const { toast } = useToast()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [rounds, setRounds] = useState<Round[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roundModalOpen, setRoundModalOpen] = useState(false)
  const [roundForm, setRoundForm] = useState({ name: '', round_number: 1 })
  const [creatingRound, setCreatingRound] = useState(false)

  const [generatingRoundId, setGeneratingRoundId] = useState<string | null>(null)

  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [matchForm, setMatchForm] = useState({
    round_id: '',
    side_a: '',
    side_b: '',
    next_match_id: '',
  })
  const [pool, setPool] = useState<Entity[]>([])
  const [creatingMatch, setCreatingMatch] = useState(false)

  const [resultMatch, setResultMatch] = useState<MatchWithDetails | null>(null)
  const [resultForm, setResultForm] = useState({ score_a: '', score_b: '' })
  const [savingResult, setSavingResult] = useState(false)

  const [toDeleteMatch, setToDeleteMatch] = useState<MatchWithDetails | null>(null)
  const [toDeleteRound, setToDeleteRound] = useState<Round | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedCompetition = competitions.find((c) => c.id === selectedId)
  const isTeam = selectedCompetition?.tipo === 'TEAM'

  const loadData = useCallback(async (competitionId: string) => {
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
      setError('No pudimos cargar las rondas.')
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
    if (selectedId) void loadData(selectedId)
  }, [selectedId, loadData])

  const matchesByRound = (roundId: string | null) =>
    matches.filter((m) => m.round_id === roundId)

  const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1

  const openRoundModal = () => {
    setRoundForm({ name: '', round_number: nextRoundNumber })
    setRoundModalOpen(true)
  }

  const onCreateRound = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    setCreatingRound(true)
    try {
      await createRound(selectedId, roundForm.name, roundForm.round_number)
      toast('Ronda creada.')
      setRoundModalOpen(false)
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo crear la ronda.', 'error')
    } finally {
      setCreatingRound(false)
    }
  }

  const onStatusChange = async (round: Round, status: RoundStatus) => {
    try {
      await updateRoundStatus(round.id, status)
      toast(`Ronda marcada como ${status === 'COMPLETED' ? 'completada' : status === 'ACTIVE' ? 'en curso' : 'pendiente'}.`)
      setRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, status } : r)))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo actualizar la ronda.', 'error')
    }
  }

  const onGenerate = async (round: Round) => {
    if (!selectedId) return
    setGeneratingRoundId(round.id)
    try {
      const { created, leftover } = await generateRoundMatches(selectedId, round.id, round.round_number)
      if (created === 0) toast('No hay enfrentamientos nuevos para generar.', 'error')
      else {
        toast(`Se crearon ${created} enfrentamientos.`)
        if (leftover > 0) toast(`Quedó ${leftover} sin pareja para esta ronda.`, 'info')
      }
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudieron generar los enfrentamientos.', 'error')
    } finally {
      setGeneratingRoundId(null)
    }
  }

  const openMatchModal = async (defaultRoundId: string) => {
    if (!selectedId || !selectedCompetition) return
    setMatchForm({ round_id: defaultRoundId, side_a: '', side_b: '', next_match_id: '' })
    setMatchModalOpen(true)
    try {
      let entities: Entity[] = []
      if (isTeam) {
        const teams = await getTeamsByCompetition(selectedId)
        entities = teams.map((t) => ({ id: t.id, name: t.name }))
      } else {
        const participants = await searchParticipants({ competitionId: selectedId })
        entities = participants.map((p) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
        }))
      }
      setPool(entities)
    } catch {
      setPool([])
      toast(isTeam ? 'No pudimos cargar los equipos.' : 'No pudimos cargar los participantes.', 'error')
    }
  }

  const onCreateMatch = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || !matchForm.side_a || !matchForm.side_b) {
      toast('Selecciona los dos lados del enfrentamiento.', 'error')
      return
    }
    setCreatingMatch(true)
    try {
      await createMatch({
        competition_id: selectedId,
        round_id: matchForm.round_id || null,
        team_a_id: isTeam ? matchForm.side_a : null,
        team_b_id: isTeam ? matchForm.side_b : null,
        participant_a_id: isTeam ? null : matchForm.side_a,
        participant_b_id: isTeam ? null : matchForm.side_b,
        next_match_id: matchForm.next_match_id || null,
      })
      toast('Enfrentamiento creado.')
      setMatchModalOpen(false)
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo crear el enfrentamiento.', 'error')
    } finally {
      setCreatingMatch(false)
    }
  }

  const openResult = (m: MatchWithDetails) => {
    setResultMatch(m)
    setResultForm({
      score_a: m.score_a != null ? String(m.score_a) : '',
      score_b: m.score_b != null ? String(m.score_b) : '',
    })
  }

  const onSaveResult = async (e: FormEvent) => {
    e.preventDefault()
    if (!resultMatch) return
    const score_a = Number(resultForm.score_a)
    const score_b = Number(resultForm.score_b)
    if (!Number.isInteger(score_a) || !Number.isInteger(score_b) || score_a < 0 || score_b < 0) {
      toast('Ingresa marcadores válidos (enteros ≥ 0).', 'error')
      return
    }
    setSavingResult(true)
    try {
      await recordMatchResult(resultMatch.id, { score_a, score_b })
      toast('Resultado guardado.')
      setResultMatch(null)
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el resultado.', 'error')
    } finally {
      setSavingResult(false)
    }
  }

  const onDeleteMatch = async () => {
    if (!toDeleteMatch) return
    setDeleting(true)
    try {
      await deleteMatch(toDeleteMatch.id)
      toast('Enfrentamiento eliminado.')
      setToDeleteMatch(null)
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const onDeleteRound = async () => {
    if (!toDeleteRound) return
    setDeleting(true)
    try {
      await deleteRound(toDeleteRound.id)
      toast('Ronda eliminada.')
      setToDeleteRound(null)
      await loadData(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const nextMatchLabel = (id: string | null): string => {
    if (!id) return 'Ninguno'
    const m = matches.find((x) => x.id === id)
    if (!m) return 'Desconocido'
    const round = rounds.find((r) => r.id === m.round_id)
    return `${matchSideName(m, 'a')} vs ${matchSideName(m, 'b')}${round ? ` · ${round.name}` : ''}`
  }

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

      <div className="px-gutter flex flex-col gap-space-sm pt-space-xs">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Rondas · {selectedCompetition?.name ?? ''}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {rounds.length} rondas · {matches.filter((m) => m.status === 'COMPLETED').length}/{matches.length} partidos jugados
            </p>
          </div>
          <button
            type="button"
            onClick={openRoundModal}
            className="h-10 px-3.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Ronda
          </button>
        </div>

        {loading ? (
          <LoadingState label="Cargando rondas…" rows={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : rounds.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {rounds.map((round) => {
              const roundMatches = matchesByRound(round.id)
              return (
                <div
                  key={round.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs p-space-md flex flex-col gap-space-sm"
                >
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-xl bg-secondary text-on-primary flex items-center justify-center flex-shrink-0 font-headline-md text-[15px] font-bold">
                      {round.round_number}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                        {round.name}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {roundMatches.length} partidos
                      </span>
                    </div>
                    <select
                      value={round.status}
                      onChange={(e) => onStatusChange(round, e.target.value as RoundStatus)}
                      className="h-8 px-1.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md outline-none focus:ring-1 focus:ring-primary-container"
                    >
                      {ROUND_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setToDeleteRound(round)}
                      className="w-9 h-9 rounded-lg bg-error/10 text-error flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Eliminar ronda"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onGenerate(round)}
                      disabled={generatingRoundId === round.id}
                      className="flex-1 h-9 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                      {generatingRoundId === round.id ? (
                        <span className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      )}
                      Generar enfrentamientos
                    </button>
                    <button
                      type="button"
                      onClick={() => void openMatchModal(round.id)}
                      className="h-9 px-3 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center gap-1.5 active:scale-[0.98] transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Partido
                    </button>
                  </div>

                  {roundMatches.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {roundMatches.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg bg-surface-container-low px-space-md py-2 flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <StatusBadge status={m.status} kind="match" />
                            {m.next_match_id ? (
                              <span className="font-label-badge text-label-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">
                                ← avanza
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col gap-1 my-1">
                              {(['a', 'b'] as const).map((side) => {
                                const name = matchSideName(m, side)
                                const won = isWinner(m, side)
                                return (
                                  <div key={side} className="flex items-center gap-1.5">
                                    {won ? (
                                      <span className="material-symbols-outlined text-[16px] text-primary">
                                        check_circle
                                      </span>
                                    ) : (
                                      <span className="w-4" />
                                    )}
                                    <span
                                      className={cn(
                                        'font-body-md text-body-md truncate',
                                        won ? 'text-primary font-bold' : 'text-on-surface',
                                        m.status === 'CANCELLED' && 'line-through opacity-60',
                                      )}
                                    >
                                      {name}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="font-headline-sm text-headline-sm font-bold text-on-surface tabular-nums">
                                {m.score_a != null ? m.score_a : '–'} · {m.score_b != null ? m.score_b : '–'}
                              </span>
                              <button
                                type="button"
                                onClick={() => openResult(m)}
                                className="h-8 px-2.5 rounded-lg bg-primary/10 text-primary font-label-md text-label-md font-bold flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                <span className="material-symbols-outlined text-[14px]">sports_score</span>
                                Resultado
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 border-t border-outline-variant/10 pt-1.5">
                            {m.next_match_id ? (
                              <span className="font-body-sm text-body-sm text-on-surface-variant flex-1 truncate">
                                Avanza a: {nextMatchLabel(m.next_match_id)}
                              </span>
                            ) : m.status === 'COMPLETED' ? (
                              <span className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                                Ganador: {isWinner(m, 'a') ? matchSideName(m, 'a') : isWinner(m, 'b') ? matchSideName(m, 'b') : '—'}
                              </span>
                            ) : (
                              <span className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                                {m.status === 'CANCELLED' ? 'Partido cancelado' : 'Pendiente de resultado'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setToDeleteMatch(m)}
                              className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center active:scale-95 transition-transform"
                              aria-label="Eliminar partido"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Esta ronda aún no tiene enfrentamientos.
                    </p>
                  )}
                </div>
              )
            })}

            {matchesByRound(null).length > 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs p-space-md flex flex-col gap-space-sm">
                <h3 className="font-label-lg text-label-lg text-on-surface font-bold">Sin ronda</h3>
                {matchesByRound(null).map((m) => (
                  <div key={m.id} className="rounded-lg bg-surface-container-low px-space-md py-2 flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-body-sm text-body-sm text-on-surface font-semibold">
                        {matchSideName(m, 'a')} vs {matchSideName(m, 'b')}
                      </span>
                      <StatusBadge status={m.status} kind="match" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setToDeleteMatch(m)}
                      className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Eliminar partido"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon="account_tree"
            title="Sin rondas"
            description={`Define las rondas de ${selectedCompetition?.name ?? 'esta competencia'}: cuartos, semis, final…`}
          />
        )}
      </div>

      {/* Crear ronda */}
      <Modal open={roundModalOpen} onClose={() => setRoundModalOpen(false)} title="Nueva ronda">
        <form onSubmit={onCreateRound} className="flex flex-col gap-space-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre</span>
            <input
              value={roundForm.name}
              onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
              placeholder={`Ronda ${roundForm.round_number}`}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Número de ronda *</span>
            <input
              type="number"
              min={1}
              value={roundForm.round_number}
              onChange={(e) => setRoundForm({ ...roundForm, round_number: Number(e.target.value) || 1 })}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <button
            type="submit"
            disabled={creatingRound}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creatingRound ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Crear ronda'}
          </button>
        </form>
      </Modal>

      {/* Crear partido */}
      <Modal open={matchModalOpen} onClose={() => setMatchModalOpen(false)} title="Nuevo enfrentamiento">
        <form onSubmit={onCreateMatch} className="flex flex-col gap-space-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Ronda</span>
            <select
              value={matchForm.round_id}
              onChange={(e) => setMatchForm({ ...matchForm, round_id: e.target.value })}
              className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            >
              <option value="">Sin ronda</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.round_number}. {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Participantes ({isTeam ? 'equipos' : 'inscritos'}) *
            </span>
            <div className="flex flex-col gap-1.5">
              <select
                value={matchForm.side_a}
                onChange={(e) => setMatchForm({ ...matchForm, side_a: e.target.value })}
                className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              >
                <option value="">Lado A…</option>
                {pool.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.side_b}
                onChange={(e) => setMatchForm({ ...matchForm, side_b: e.target.value })}
                className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              >
                <option value="">Lado B…</option>
                {pool.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {pool.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No hay {isTeam ? 'equipos' : 'inscritos'} para esta competencia.
              </p>
            ) : null}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Siguiente partido (el ganador avanzará)
            </span>
            <select
              value={matchForm.next_match_id}
              onChange={(e) => setMatchForm({ ...matchForm, next_match_id: e.target.value })}
              className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            >
              <option value="">Ninguno</option>
              {matches
                .filter((m) => m.status !== 'COMPLETED' && m.id !== toDeleteMatch?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {nextMatchLabel(m.id)}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={creatingMatch}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creatingMatch ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Crear enfrentamiento'}
          </button>
        </form>
      </Modal>

      {/* Resultado */}
      <Modal
        open={!!resultMatch}
        onClose={() => setResultMatch(null)}
        title={`Resultado: ${resultMatch ? matchSideName(resultMatch, 'a') : ''} vs ${resultMatch ? matchSideName(resultMatch, 'b') : ''}`}
      >
        <form onSubmit={onSaveResult} className="flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                {resultMatch ? matchSideName(resultMatch, 'a') : 'Lado A'}
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={resultForm.score_a}
                onChange={(e) => setResultForm({ ...resultForm, score_a: e.target.value })}
                placeholder="0"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
            </label>
            <span className="font-headline-md text-headline-md font-bold text-on-surface-variant pt-5">:</span>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                {resultMatch ? matchSideName(resultMatch, 'b') : 'Lado B'}
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={resultForm.score_b}
                onChange={(e) => setResultForm({ ...resultForm, score_b: e.target.value })}
                placeholder="0"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
            </label>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            El marcador cierra el partido y el ganador avanza si el partido tiene siguiente. No se permiten
            empates en eliminatoria directa.
          </p>
          <button
            type="submit"
            disabled={savingResult}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {savingResult ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Guardar resultado'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDeleteMatch}
        title="Eliminar enfrentamiento"
        message="Se quitará este partido de la ronda. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onCancel={() => setToDeleteMatch(null)}
        onConfirm={onDeleteMatch}
      />
      <ConfirmDialog
        open={!!toDeleteRound}
        title="Eliminar ronda"
        message={`Se eliminará la ronda ${toDeleteRound?.name ?? ''} junto a todos sus partidos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setToDeleteRound(null)}
        onConfirm={onDeleteRound}
      />
      {deleting ? <LoadingState label="Eliminando…" rows={1} /> : null}
    </div>
  )
}