import { useEffect, useState, type FormEvent } from 'react'
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getAvailableParticipantsForTeam,
  getTeamById,
  getTeamsByCompetition,
  removeTeamMember,
  updateTeam,
} from '@/services/teams'
import { getCompetitions } from '@/services/competitions'
import { useToast } from '@/components/ui/Toast'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { TEAM_STATUS_META } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Competition, ParticipantWithChurch, Team, TeamMemberWithParticipant, TeamStatus } from '@/types'

type TeamWithCount = Team & { member_count: number }
type TeamDetailWithMembers = Team & { members: TeamMemberWithParticipant[] }

const STATUS_OPTIONS = Object.entries(TEAM_STATUS_META).map(([value, meta]) => ({
  value: value as TeamStatus,
  label: meta.label,
}))

export function AdminTeams() {
  const { toast } = useToast()
  const [teamCompetitions, setTeamCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [teams, setTeams] = useState<TeamWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', max_players: 5 })
  const [creating, setCreating] = useState(false)

  const [editing, setEditing] = useState<TeamWithCount | null>(null)
  const [editForm, setEditForm] = useState({ name: '', max_players: 5, status: 'OPEN' as TeamStatus })
  const [saving, setSaving] = useState(false)

  const [membersTeam, setMembersTeam] = useState<TeamDetailWithMembers | null>(null)
  const [available, setAvailable] = useState<ParticipantWithChurch[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [addId, setAddId] = useState('')

  const [toDelete, setToDelete] = useState<TeamWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedCompetition = teamCompetitions.find((c) => c.id === selectedId)

  const loadTeams = async (competitionId: string) => {
    setLoading(true)
    try {
      const rows = await getTeamsByCompetition(competitionId)
      setTeams(rows)
      setError(null)
    } catch {
      setTeams([])
      setError('No pudimos cargar los equipos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getCompetitions()
      .then((all) => {
        if (!active) return
        const comps = all.filter((c) => c.permite_equipos)
        setTeamCompetitions(comps)
        if (comps.length > 0) setSelectedId(comps[0].id)
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
    if (selectedId) void loadTeams(selectedId)
  }, [selectedId])

  const openCreate = () => {
    if (!selectedCompetition) return
    setCreateForm({ name: '', max_players: selectedCompetition.jugadores_por_equipo })
    setCreateOpen(true)
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || !createForm.name.trim()) {
      toast('El nombre del equipo es obligatorio.', 'error')
      return
    }
    setCreating(true)
    try {
      await createTeam(selectedId, createForm.name, createForm.max_players)
      toast('Equipo creado.')
      setCreateOpen(false)
      await loadTeams(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo crear el equipo.', 'error')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (t: TeamWithCount) => {
    setEditing(t)
    setEditForm({ name: t.name, max_players: t.max_players, status: t.status })
  }

  const onEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editForm.name.trim() || editForm.max_players < 1) {
      toast('Nombre y cupo obligatorios.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateTeam(editing.id, { ...editForm, name: editForm.name.trim() })
      toast('Equipo actualizado.')
      setEditing(null)
      await loadTeams(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo actualizar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openMembers = async (teamRef: { id: string }) => {
    setAddId('')
    setMembersLoading(true)
    setMembersTeam(null)
    try {
      const [detail, avail] = await Promise.all([
        getTeamById(teamRef.id),
        getAvailableParticipantsForTeam(teamRef.id),
      ])
      if (!detail) throw new Error('Equipo no encontrado')
      setMembersTeam(detail)
      setAvailable(avail)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos cargar el plantel.', 'error')
    } finally {
      setMembersLoading(false)
    }
  }

  const onAddMember = async () => {
    if (!membersTeam || !addId) {
      toast('Selecciona un participante.', 'error')
      return
    }
    try {
      await addTeamMember(membersTeam.id, addId)
      toast('Integrante agregado.')
      setAddId('')
      await openMembers(membersTeam)
      await loadTeams(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo agregar.', 'error')
    }
  }

  const onRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember(memberId)
      toast('Integrante retirado.')
      await openMembers(membersTeam!)
      await loadTeams(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo retirar.', 'error')
    }
  }

  const onDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteTeam(toDelete.id)
      toast('Equipo eliminado.')
      setToDelete(null)
      await loadTeams(selectedId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col w-full pb-space-lg gap-space-sm">
      {/* Selector de competencias */}
      <div className="w-full bg-surface-container-low px-gutter py-space-sm sticky top-[96px] z-30 backdrop-blur-md border-b border-surface-container-high/60">
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
          {teamCompetitions.map((comp) => (
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
              Equipos · {selectedCompetition?.name ?? ''}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {teams.length} planteles · cupo {selectedCompetition?.jugadores_por_equipo ?? 0}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-3.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Equipo
          </button>
        </div>

        {loading ? (
          <LoadingState label="Cargando equipos…" rows={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : teams.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs p-space-md flex flex-col gap-space-sm"
              >
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-secondary text-on-primary flex items-center justify-center flex-shrink-0 font-headline-md text-[15px] font-bold">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">{t.name}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t.member_count}/{t.max_players} jugadores
                    </span>
                  </div>
                  <StatusBadge status={t.status} kind="team" />
                </div>
                <div className="flex items-center gap-1.5 border-t border-outline-variant/20 pt-space-sm">
                  <button
                    type="button"
                    onClick={() => openMembers(t)}
                    className="flex-1 h-9 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    Plantel
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(t)}
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
          <EmptyState
            icon="groups"
            title="Sin equipos"
            description={`Crea el primer plantel para ${selectedCompetition?.name ?? 'esta competencia'}.`}
          />
        )}
      </div>

      {/* Crear equipo */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo equipo">
        <form onSubmit={onCreate} className="flex flex-col gap-space-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre *</span>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Ej. Los Titanes"
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Cupo máximo</span>
            <input
              type="number"
              min={1}
              value={createForm.max_players}
              onChange={(e) => setCreateForm({ ...createForm, max_players: Number(e.target.value) || 1 })}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creating ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Crear equipo'}
          </button>
        </form>
      </Modal>

      {/* Editar equipo */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Editar: ${editing?.name ?? ''}`}>
        {editing ? (
          <form onSubmit={onEdit} className="flex flex-col gap-space-sm">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre</span>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Cupo máximo</span>
              <input
                type="number"
                min={1}
                value={editForm.max_players}
                onChange={(e) => setEditForm({ ...editForm, max_players: Number(e.target.value) || 1 })}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Estado</span>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TeamStatus })}
                className="h-11 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Guardar cambios'}
            </button>
          </form>
        ) : null}
      </Modal>

      {/* Plantel */}
      <Modal open={!!membersTeam} onClose={() => setMembersTeam(null)} title={`Plantel: ${membersTeam?.name ?? ''}`}>
        {membersLoading && !membersTeam ? (
          <LoadingState label="Cargando plantel…" rows={3} />
        ) : membersTeam ? (
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">group</span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                {membersTeam.members.length}/{membersTeam.max_players}
              </span>
              <StatusBadge status={membersTeam.status} kind="team" />
            </div>

            {membersTeam.members.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {membersTeam.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 bg-surface-container-low rounded-lg px-space-md py-2"
                  >
                    <span className="font-body-md text-body-md text-on-surface flex-1 truncate">
                      {m.participant?.first_name ?? '—'} {m.participant?.last_name ?? ''}
                      <span className="text-on-surface-variant text-[12px] block">
                        {m.participant?.participant_code ?? ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveMember(m.id)}
                      className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Retirar"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Este equipo aún no tiene integrantes.</p>
            )}

            <div className="border-t border-outline-variant/20 pt-space-sm flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Agregar integrante</span>
              <div className="flex gap-1.5">
                <select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  className="flex-1 h-10 px-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary-container shadow-inner min-w-0"
                >
                  <option value="">Inscritos sin equipo…</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} · {p.church?.name ?? ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onAddMember}
                  className="h-10 px-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Añadir
                </button>
              </div>
              {available.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No hay inscritos disponibles: todos ya tienen equipo en esta competencia.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar equipo"
        message={`Se eliminará a ${toDelete?.name ?? ''} junto a sus integrantes y referencias en partidos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={onDelete}
      />
      {deleting ? <LoadingState label="Eliminando…" rows={1} /> : null}
    </div>
  )
}