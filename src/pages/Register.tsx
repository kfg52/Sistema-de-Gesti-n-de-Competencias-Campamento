import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurches } from '@/hooks/useChurches'
import { useCompetitions } from '@/hooks/useCompetitions'
import { createParticipant } from '@/services/participants'
import { registerCompetitions } from '@/services/registrations'
import { DuplicateRegistrationError, CompetitionFullError } from '@/services/errors'
import type { Competition, CompetitionWithStats } from '@/types'
import { cn } from '@/lib/utils'
import { PARTICIPANT_TOKEN_KEY } from '@/lib/constants'
import { useToast } from '@/components/ui/Toast'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

const SPORT_ICONS: Record<string, string> = {
  Basketball: 'sports_basketball',
  Baseball: 'sports_baseball',
  'Dominó': 'casino',
  'Natación': 'pool',
  'Carrera campo traviesa': 'hiking',
  'Ajedrez': 'neurology',
}

const SPORT_COLORS: Record<string, string> = {
  Basketball: 'text-primary bg-primary-fixed/60',
  Baseball: 'text-secondary bg-secondary-fixed',
  'Dominó': 'text-tertiary bg-tertiary-fixed',
  'Natación': 'text-secondary bg-secondary-fixed',
  'Carrera campo traviesa': 'text-primary bg-primary-fixed/60',
  'Ajedrez': 'text-secondary bg-surface-container-high',
}

export function Register() {
  const navigate = useNavigate()
  const { churches, loading: churchesLoading, error: churchesError } = useChurches()
  const { competitions, loading: compsLoading, error: compsError } = useCompetitions()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [churchId, setChurchId] = useState('')
  const [churchSearch, setChurchSearch] = useState('')
  const [churchOpen, setChurchOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ first_name?: string; last_name?: string; church_id?: string }>({})
  const [successInfo, setSuccessInfo] = useState<{
    name: string
    church: string
    code: string
    competitions: Competition[]
  } | null>(null)

  const toggleCompetition = (comp: CompetitionWithStats) => {
    if (comp.is_full && !selected.has(comp.id)) {
      toast(`Los cupos para «${comp.name}» están agotados.`, 'error')
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(comp.id)) next.delete(comp.id)
      else next.add(comp.id)
      return next
    })
  }

  const goToStep2 = () => {
    const errors: typeof fieldErrors = {}
    if (!firstName.trim()) errors.first_name = 'Los nombres son obligatorios.'
    if (!lastName.trim()) errors.last_name = 'Los apellidos son obligatorios.'
    if (!churchId) errors.church_id = 'Selecciona tu iglesia de procedencia.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast('Verifica los campos marcados en rojo.', 'error')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const confirmRegistration = async () => {
    if (selected.size === 0) {
      toast('Selecciona al menos una disciplina antes de confirmar.', 'error')
      return
    }
    setBusy(true)
    try {
      const participant = await createParticipant({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        church_id: churchId,
      })
      try {
        await registerCompetitions(participant.id, [...selected])
      } catch (err) {
        if (err instanceof DuplicateRegistrationError || err instanceof CompetitionFullError) {
          toast(err.message, 'error')
          return
        }
        throw err
      }

      localStorage.setItem(PARTICIPANT_TOKEN_KEY, participant.participant_token)

      const church = churches.find((c) => c.id === churchId)
      setSuccessInfo({
        name: `${participant.first_name} ${participant.last_name}`,
        church: church?.name ?? 'IDP Nacional',
        code: participant.participant_code,
        competitions: competitions.filter((c) => selected.has(c.id)),
      })
    } catch {
      toast('⚠️ No pudimos completar tu inscripción. Intenta nuevamente.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const loading = churchesLoading || compsLoading

  if (loading) return <LoadingState label="Cargando formulario de inscripción..." rows={4} />

  if (churchesError || compsError) {
    return (
      <ErrorState message="⚠️ No pudimos cargar el formulario de inscripción. Intenta nuevamente." />
    )
  }

  return (
    <div className="flex flex-col w-full">
      {/* Progreso */}
      <section className="px-gutter pt-space-sm pb-space-xs">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20">
          <div className="flex items-center justify-between gap-space-sm mb-space-sm">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold shadow-sm">
                {step}
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                {step === 1 ? 'Paso 1 de 2: Datos del Participante' : 'Paso 2 de 2: Selección Deportiva'}
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-bold">
              {step === 1 ? '50%' : '100%'}
            </span>
          </div>
          <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden flex">
            <div
              className={cn(
                'h-full bg-primary-container rounded-full transition-all duration-300',
                step === 1 ? 'w-1/2' : 'w-full',
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-space-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(
                'flex items-center gap-1 font-label-md text-label-md font-bold transition-colors',
                step === 1 ? 'text-primary' : 'text-secondary',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>1. Datos</span>
            </button>
            <span className="text-outline-variant font-label-md">·</span>
            <button
              type="button"
              onClick={() => step === 2 && setStep(1)}
              className={cn(
                'flex items-center gap-1 font-label-md text-label-md transition-colors',
                step === 2 ? 'text-primary' : 'text-secondary',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">sports_volleyball</span>
              <span>2. Deportes</span>
            </button>
          </div>
        </div>
      </section>

      {/* Aviso normativa */}
      <section className="px-gutter pt-space-xs">
        <div className="bg-surface-container rounded-xl p-space-md flex items-start gap-space-sm shadow-sm border-l-4 border-primary-container">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-lg text-label-lg text-on-surface leading-tight font-bold">
              Normativa de Confraternidad
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Cupos rigurosos por disciplina. El sistema impide registros duplicados en la misma
              competencia.
            </p>
          </div>
        </div>
      </section>

      {/* STEP 1 */}
      {step === 1 ? (
        <section className="px-gutter pt-space-sm pb-space-lg flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Ficha del Hermano</h2>
              </div>
              <span className="bg-primary-fixed text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full uppercase font-bold">
                Rápido &lt; 2 min
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1" htmlFor="reg-nombres">
                <span>Nombres</span>
                <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                  badge
                </span>
                <input
                  id="reg-nombres"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Juan Carlos"
                  className={cn(
                    'w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container transition-colors outline-none shadow-inner border focus:border-primary-container',
                    fieldErrors.first_name ? 'border-error' : 'border-transparent',
                  )}
                />
              </div>
              {fieldErrors.first_name ? (
                <p className="font-body-sm text-body-sm text-error">{fieldErrors.first_name}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1" htmlFor="reg-apellidos">
                <span>Apellidos</span>
                <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                  person_outline
                </span>
                <input
                  id="reg-apellidos"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Pérez Gómez"
                  className={cn(
                    'w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container transition-colors outline-none shadow-inner border focus:border-primary-container',
                    fieldErrors.last_name ? 'border-error' : 'border-transparent',
                  )}
                />
              </div>
              {fieldErrors.last_name ? (
                <p className="font-body-sm text-body-sm text-error">{fieldErrors.last_name}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1" htmlFor="reg-iglesia">
                <span>Iglesia de procedencia (Región / Provincia)</span>
                <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none z-10">
                  church
                </span>
                <input
                  id="reg-iglesia"
                  type="text"
                  role="combobox"
                  aria-expanded={churchOpen}
                  aria-controls="reg-iglesia-list"
                  autoComplete="off"
                  value={churchSearch}
                  onFocus={() => {
                    setChurchOpen(true)
                    if (!churchSearch) setChurchSearch('')
                  }}
                  onChange={(e) => {
                    setChurchSearch(e.target.value)
                    setChurchId('')
                    setChurchOpen(true)
                  }}
                  placeholder="Busca tu iglesia regional..."
                  className={cn(
                    'w-full h-11 pl-10 pr-9 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container transition-colors outline-none shadow-inner cursor-text border focus:border-primary-container',
                    fieldErrors.church_id ? 'border-error' : 'border-transparent',
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setChurchOpen((open) => !open)}
                  aria-label={churchOpen ? 'Ocultar iglesias' : 'Mostrar iglesias'}
                  className="absolute right-2 w-7 h-7 flex items-center justify-center text-secondary hover:bg-surface-container-highest rounded-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] pointer-events-none">
                    {churchOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {churchOpen ? (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setChurchOpen(false)} aria-hidden />
                    <ul
                      id="reg-iglesia-list"
                      role="listbox"
                      aria-label="Iglesias disponibles"
                      className="absolute z-40 top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-xl overscroll-contain"
                    >
                      {churches
                        .filter((c) => c.name.toLowerCase().includes(churchSearch.trim().toLowerCase()))
                        .map((c) => {
                          const selected = c.id === churchId
                          return (
                            <li key={c.id} role="option" aria-selected={selected}>
                              <button
                                type="button"
                                onClick={() => {
                                  setChurchId(c.id)
                                  setChurchSearch(c.name)
                                  setChurchOpen(false)
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3.5 py-3 text-left transition-colors',
                                  selected ? 'bg-primary/10' : 'hover:bg-surface-container-high',
                                )}
                              >
                                <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0">
                                  place
                                </span>
                                <span
                                  className={cn(
                                    'font-body-md text-body-md truncate flex-1',
                                    selected ? 'text-primary font-bold' : 'text-on-surface',
                                  )}
                                >
                                  {c.name}
                                </span>
                                {selected ? (
                                  <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0">
                                    check_circle
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          )
                        })}
                      {churches.filter((c) =>
                        c.name.toLowerCase().includes(churchSearch.trim().toLowerCase()),
                      ).length === 0 ? (
                        <li className="px-3.5 py-3 font-body-sm text-body-sm text-on-surface-variant">
                          No encontramos una iglesia con «{churchSearch}».
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
              </div>
              {fieldErrors.church_id ? (
                <p className="font-body-sm text-body-sm text-error">{fieldErrors.church_id}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={goToStep2}
              className="w-full h-12 mt-space-xs rounded-lg bg-primary hover:bg-primary-dark text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md active:scale-[0.99] transition-all font-bold"
            >
              <span>Continuar a Selección Deportiva</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* STEP 2 */}
          <section className="px-gutter pt-space-xs pb-32 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  ¿En qué competencias participarás?
                </h2>
                <span className="font-body-sm text-body-sm text-secondary truncate">
                  Puedes seleccionar varias disciplinas
                </span>
              </div>
              <span className="bg-primary text-on-primary font-label-sm text-label-sm font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">done_all</span>
                <span>{selected.size} elegidas</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-space-sm mt-space-xs">
              {competitions.map((comp) => {
                const isSelected = selected.has(comp.id)
                const isFull = comp.is_full
                const icon = SPORT_ICONS[comp.name] ?? 'emoji_events'
                const iconColor = SPORT_COLORS[comp.name] ?? 'text-primary bg-primary-fixed/60'
                return (
                  <button
                    key={comp.id}
                    type="button"
                    disabled={isFull && !isSelected}
                    onClick={() => toggleCompetition(comp)}
                    className={cn(
                      'rounded-xl p-space-md flex items-center justify-between transition-all text-left relative',
                      isFull && !isSelected
                        ? 'opacity-60 cursor-not-allowed bg-surface-container-low border border-outline-variant/30'
                        : isSelected
                          ? 'cursor-pointer bg-surface-container-highest shadow-md border-2 border-secondary/20'
                          : 'cursor-pointer bg-surface-container-lowest shadow-sm border border-outline-variant/30 hover:border-outline-variant/60',
                    )}
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-[26px] shadow-sm flex-shrink-0', iconColor)}>
                        <span className="material-symbols-outlined text-[24px]">{icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-headline-sm text-headline-sm text-on-surface">
                            {comp.name}
                          </span>
                          <span className="bg-primary-fixed text-primary font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded uppercase">
                            {comp.tipo === 'TEAM' ? `${comp.jugadores_por_equipo} por equipo` : 'Individual'}
                          </span>
                          {isFull ? (
                            <span className="bg-error/15 text-error font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">block</span>
                              AGOTADO
                            </span>
                          ) : comp.max_cupos !== null && comp.cupos_disponibles !== null ? (
                            comp.cupos_disponibles <= 5 ? (
                              <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">bolt</span>
                                ¡Últimos {comp.cupos_disponibles} cupos!
                              </span>
                            ) : (
                              <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium px-2 py-0.5 rounded-full">
                                {comp.cupos_disponibles} cupos libres
                              </span>
                            )
                          ) : null}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {comp.description}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-colors',
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline shadow-inner',
                      )}
                    >
                      <span className={cn('material-symbols-outlined text-[18px]', !isSelected && 'opacity-0')}>
                        check
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-space-sm mt-space-xs">
              <span className="material-symbols-outlined text-secondary text-[22px]">diversity_3</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                La coordinación asignará tu equipo formal para deportes colectivos según tu iglesia
                de procedencia.
              </span>
            </div>
          </section>

          {/* Barra resumen */}
          <aside className="fixed bottom-16 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_-6px_20px_rgba(22,27,40,0.08)] px-gutter py-space-sm border-t border-outline-variant/20">
            <div className="max-w-md mx-auto flex items-center justify-between gap-space-sm">
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                  Resumen de registro
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-[22px] text-primary leading-tight font-extrabold">
                    {selected.size}
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface truncate">
                    disciplinas
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={confirmRegistration}
                className="flex-1 h-12 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-60 text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs shadow-lg active:scale-95 transition-all font-bold tracking-wide"
              >
                {busy ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRMAR INSCRIPCIÓN</span>
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Modal de éxito */}
      {successInfo ? (
        <div className="fixed inset-0 z-[55] bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-gutter">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg w-full max-w-sm flex flex-col items-center text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-space-sm shadow-md">
              <span className="material-symbols-outlined text-[36px]">sports_score</span>
            </div>
            <span className="font-headline-md text-headline-md text-on-surface font-bold">
              ¡Inscripción Confirmada!
            </span>
            <span className="font-label-md text-label-md text-secondary mt-1">
              {successInfo.code}
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
              Hermano <strong className="text-on-surface">{successInfo.name}</strong>, tus cupos han
              quedado asegurados bajo la delegación de{' '}
              <strong className="text-on-surface">{successInfo.church}</strong>.
            </p>
            <div className="w-full bg-surface-container-low rounded-lg p-space-sm mt-space-md text-left flex flex-col gap-1 border border-outline-variant/30">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">
                Competencias Asignadas:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {successInfo.competitions.map((comp) => (
                  <span
                    key={comp.id}
                    className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold"
                  >
                    {comp.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/mis-competencias')}
              className="w-full h-11 mt-space-lg rounded-lg bg-primary hover:bg-primary-dark text-on-primary font-label-lg text-label-lg shadow-md font-bold transition-colors"
            >
              Ir a Mis Juegos
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}