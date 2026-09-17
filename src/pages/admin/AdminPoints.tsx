import { useEffect, useState, type FormEvent } from 'react'
import { getRankingPoints, updateRankingPoints } from '@/services/classification'
import { useToast } from '@/components/ui/Toast'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { RankingPoints } from '@/types'

interface FormState {
  first_place: string
  second_place: string
  third_place: string
  participation: string
  victory: string
}

const FIELDS: Array<{ key: keyof FormState; label: string; hint: string }> = [
  { key: 'first_place', label: '1.º lugar', hint: 'Campeón de la competencia' },
  { key: 'second_place', label: '2.º lugar', hint: 'Subcampeón (perdedor de la final)' },
  { key: 'third_place', label: '3.º lugar', hint: 'Perdedores de la semifinal' },
  { key: 'participation', label: 'Participación', hint: 'Por iglesia representada por competencia' },
  { key: 'victory', label: 'Victoria', hint: 'Por partido completado ganado' },
]

export function AdminPoints() {
  const { toast } = useToast()
  const [config, setConfig] = useState<RankingPoints | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    getRankingPoints()
      .then((row) => {
        if (!active) return
        setConfig(row)
        setForm(
          row
            ? {
                first_place: String(row.first_place),
                second_place: String(row.second_place),
                third_place: String(row.third_place),
                participation: String(row.participation),
                victory: String(row.victory),
              }
            : { first_place: '10', second_place: '6', third_place: '4', participation: '2', victory: '3' },
        )
        setError(null)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar la configuración de puntos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const parsed: { [K in keyof FormState]: number } = {
      first_place: Number(form.first_place),
      second_place: Number(form.second_place),
      third_place: Number(form.third_place),
      participation: Number(form.participation),
      victory: Number(form.victory),
    }
    setBusy(true)
    try {
      const saved = await updateRankingPoints({
        first_place: parsed.first_place,
        second_place: parsed.second_place,
        third_place: parsed.third_place,
        participation: parsed.participation,
        victory: parsed.victory,
      })
      setConfig(saved)
      toast('Ponderación guardada. La clasificación se actualiza al instante.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <LoadingState label="Cargando ponderación…" rows={2} />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
        <ErrorState message={error ?? 'Sin datos disponibles.'} />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      <header className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Puntos y clasificación</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Define cuántos puntos vale cada resultado. Los cambios se aplican al instante en la página pública.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs p-space-md flex flex-col gap-space-md"
      >
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface font-bold">{f.label}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant -mt-0.5">{f.hint}</span>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-lg text-label-lg text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </label>
          ))}
        </div>
        {config && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Última actualización: {new Date(config.updated_at).toLocaleString('es-ES')}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {busy && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Guardar ponderación
          </button>
        </div>
      </form>
    </div>
  )
}