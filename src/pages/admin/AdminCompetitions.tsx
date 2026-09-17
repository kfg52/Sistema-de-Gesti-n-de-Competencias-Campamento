import { useEffect, useState, type FormEvent } from 'react'
import {
  getCompetitionsWithStats,
  updateCompetition,
  type UpdateCompetitionInput,
} from '@/services/competitions'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { COMPETITION_TYPE_LABEL } from '@/lib/constants'
import type { CompetitionStatus, CompetitionType, CompetitionWithStats } from '@/types'

const ESTADOS: CompetitionStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'FINISHED']

interface EditForm {
  name: string
  description: string
  tipo: CompetitionType
  jugadores_por_equipo: number
  permite_equipos: boolean
  max_cupos: string
  activa: boolean
  estado: CompetitionStatus
}

export function AdminCompetitions() {
  const { toast } = useToast()
  const [list, setList] = useState<CompetitionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<CompetitionWithStats | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const rows = await getCompetitionsWithStats()
    setList(rows)
    return rows
  }

  useEffect(() => {
    let active = true
    getCompetitionsWithStats()
      .then((rows) => {
        if (!active) return
        setList(rows)
        setError(null)
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

  const openEdit = (c: CompetitionWithStats) => {
    setEditing(c)
    setForm({
      name: c.name,
      description: c.description ?? '',
      tipo: c.tipo,
      jugadores_por_equipo: c.jugadores_por_equipo,
      permite_equipos: c.permite_equipos,
      max_cupos: c.max_cupos !== null && c.max_cupos !== undefined ? String(c.max_cupos) : '',
      activa: c.activa,
      estado: c.estado,
    })
  }

  const applyPatch = async (id: string, patch: UpdateCompetitionInput) => {
    try {
      await updateCompetition(id, patch)
      await reload()
      toast('Configuración guardada.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error')
    }
  }

  const onToggleActiva = (c: CompetitionWithStats) => {
    void applyPatch(c.id, { activa: !c.activa })
  }

  const onEstadoChange = (c: CompetitionWithStats, estado: CompetitionStatus) => {
    void applyPatch(c.id, { estado })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !form) return
    if (!form.name.trim() || form.jugadores_por_equipo < 1) {
      toast('El nombre y el cupo de jugadores son obligatorios.', 'error')
      return
    }
    setBusy(true)
    try {
      const parsedCupos = form.max_cupos.trim()
        ? Math.max(1, parseInt(form.max_cupos.trim(), 10))
        : null

      await applyPatch(editing.id, {
        ...form,
        name: form.name.trim(),
        description: form.description.trim() || null,
        max_cupos: parsedCupos,
      })
      setEditing(null)
      setForm(null)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Cargando competencias…" rows={4} />
  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-sm pt-space-sm">
      <div className="px-1 pt-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Competencias</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Activa, edita cupos o cierra disciplinas del torneo
        </p>
      </div>

      <div className="flex flex-col gap-space-sm">
        {list.map((c) => (
          <div
            key={c.id}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs p-space-md flex flex-col gap-space-sm"
          >
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">sports</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                    {c.name}
                  </span>
                  {c.is_full ? (
                    <span className="font-label-sm text-[11px] font-bold px-1.5 py-0.5 rounded bg-error/15 text-error">
                      LLENO
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant flex-wrap">
                  <span>{COMPETITION_TYPE_LABEL[c.tipo]}</span>
                  <span>·</span>
                  <span>{c.jugadores_por_equipo} jug/equipo</span>
                  <span>·</span>
                  <span className="font-semibold text-primary">
                    Cupos: {c.registrations_count} / {c.max_cupos ?? '∞'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEdit(c)}
                className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
                aria-label="Editar"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-space-sm border-t border-outline-variant/20 pt-space-sm">
              {/* Estado */}
              <select
                value={c.estado}
                onChange={(e) => onEstadoChange(c, e.target.value as CompetitionStatus)}
                className="h-8 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-[12px] font-bold px-2 outline-none border border-transparent focus:border-primary-container"
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Switch activa */}
              <button
                type="button"
                role="switch"
                aria-checked={c.activa}
                onClick={() => onToggleActiva(c)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  c.activa ? 'bg-primary' : 'bg-surface-container-high'
                } flex-shrink-0`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    c.activa ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Editar: ${editing?.name ?? ''}`}>
        {form ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-space-sm">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Descripción</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner resize-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-space-sm">
              <label className="flex flex-col gap-1.5">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as CompetitionType })}
                  className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
                >
                  <option value="TEAM">Por equipos</option>
                  <option value="INDIVIDUAL">Individual</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Jugadores/equipo</span>
                <input
                  type="number"
                  min={1}
                  value={form.jugadores_por_equipo}
                  onChange={(e) => setForm({ ...form, jugadores_por_equipo: Number(e.target.value) || 1 })}
                  className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Cupo máximo de participantes
              </span>
              <input
                type="number"
                min={1}
                placeholder="Dejar vacío para ilimitado (ej: 32)"
                value={form.max_cupos}
                onChange={(e) => setForm({ ...form, max_cupos: e.target.value })}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
              <span className="font-body-sm text-[12px] text-on-surface-variant">
                Límite total de inscripciones permitidas en esta disciplina.
              </span>
            </label>
            <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface font-semibold">
              <input
                type="checkbox"
                checked={form.permite_equipos}
                onChange={(e) => setForm({ ...form, permite_equipos: e.target.checked })}
                className="w-5 h-5 accent-primary"
              />
              Permite equipos
            </label>
            <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface font-semibold">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                className="w-5 h-5 accent-primary"
              />
              Competencia activa
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 mt-space-xs disabled:opacity-60"
            >
              {busy ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Guardar cambios'}
            </button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}