import { useEffect, useState, type FormEvent } from 'react'
import {
  createParticipant,
  deleteParticipant,
  searchParticipants,
  updateParticipant,
  type CreateParticipantInput,
} from '@/services/participants'
import { useChurches } from '@/hooks/useChurches'
import { useToast } from '@/components/ui/Toast'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ParticipantWithChurch } from '@/types'

const EMPTY_FORM: CreateParticipantInput = { first_name: '', last_name: '', church_id: '' }

export function AdminParticipants() {
  const { churches } = useChurches()
  const { toast } = useToast()
  const [list, setList] = useState<ParticipantWithChurch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [churchFilter, setChurchFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ParticipantWithChurch | null>(null)
  const [form, setForm] = useState<CreateParticipantInput>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  const [toDelete, setToDelete] = useState<ParticipantWithChurch | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    searchParticipants({ search: debounced || undefined, churchId: churchFilter || undefined })
      .then((rows) => {
        if (!active) return
        setList(rows)
        setError(null)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar los participantes.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [debounced, churchFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (p: ParticipantWithChurch) => {
    setEditing(p)
    setForm({ first_name: p.first_name, last_name: p.last_name, church_id: p.church_id })
    setFormOpen(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.church_id) {
      toast('Completa nombre, apellidos e iglesia.', 'error')
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await updateParticipant(editing.id, form)
        toast('Participante actualizado.')
      } else {
        await createParticipant(form)
        toast('Participante registrado.')
      }
      setFormOpen(false)
      const rows = await searchParticipants({ search: debounced || undefined, churchId: churchFilter || undefined })
      setList(rows)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el participante.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteParticipant(toDelete.id)
      toast('Participante eliminado.')
      setToDelete(null)
      setList((prev) => prev.filter((p) => p.id !== toDelete.id))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar el participante.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-sm pt-space-sm">
      <div className="flex items-center justify-between px-1 pt-space-sm">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Participantes</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {list.length} resultados
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 px-3.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-space-sm">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary-container"
          />
        </div>
        <select
          value={churchFilter}
          onChange={(e) => setChurchFilter(e.target.value)}
          className="h-10 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-sm text-body-sm px-2 outline-none focus:ring-1 focus:ring-primary-container max-w-[140px]"
        >
          <option value="">Todas las iglesias</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Cargando participantes…" rows={4} />
      ) : error ? (
        <ErrorState message={error} />
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-space-sm">
          {list.map((p) => (
            <div
              key={p.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs p-space-md flex items-center gap-space-sm"
            >
              <div className="w-10 h-10 rounded-full bg-secondary text-on-primary flex items-center justify-center flex-shrink-0 font-headline-md text-[15px] font-bold">
                {p.first_name.charAt(0)}
                {p.last_name.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                  {p.first_name} {p.last_name}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {p.participant_code} · {p.church?.name ?? 'IDP'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Editar"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(p)}
                  className="w-9 h-9 rounded-lg bg-error/10 text-error flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Eliminar"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="badge" title="Sin participantes" description="Ajusta los filtros o registra un nuevo participante." />
      )}

      {/* Modal crear/editar */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar participante' : 'Nuevo participante'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-space-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Nombres *</span>
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Apellidos *</span>
            <input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Iglesia *</span>
            <select
              value={form.church_id}
              onChange={(e) => setForm({ ...form, church_id: e.target.value })}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            >
              <option value="">Selecciona…</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 mt-space-xs disabled:opacity-60"
          >
            {busy ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              editing ? 'Guardar cambios' : 'Crear participante'
            )}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar participante"
        message={`Se eliminará a ${toDelete?.first_name ?? ''} ${toDelete?.last_name ?? ''} junto a sus inscripciones y equipos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={onDelete}
      />
      {deleting ? <LoadingState label="Eliminando…" rows={1} /> : null}
    </div>
  )
}