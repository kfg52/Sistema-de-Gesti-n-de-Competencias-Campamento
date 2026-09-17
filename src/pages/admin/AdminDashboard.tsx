import { Link } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

const QUICK_ACTIONS = [
  { to: '/admin/asistencia', icon: 'how_to_reg', title: 'Mesa de Acreditación', subtitle: 'Check-in QR y asistencia en vivo', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { to: '/admin/participantes', icon: 'badge', title: 'Participantes', subtitle: 'Registrar y gestionar atletas', color: 'bg-primary/10 text-primary' },
  { to: '/admin/competencias', icon: 'sports', title: 'Competencias', subtitle: 'Configurar disciplinas y cupos', color: 'bg-secondary/10 text-secondary' },
  { to: '/admin/equipos', icon: 'groups', title: 'Equipos', subtitle: 'Formar planteles y cupos', color: 'bg-tertiary/10 text-tertiary' },
  { to: '/admin/rondas', icon: 'account_tree', title: 'Rondas y resultados', subtitle: 'Partidos, marcadores y avance', color: 'bg-success/10 text-success' },
  { to: '/admin/puntos', icon: 'emoji_events', title: 'Puntos y clasificación', subtitle: 'Pesos de podio y bonos', color: 'bg-amber-500/10 text-amber-700' },
] as const

export function AdminDashboard() {
  const { user, profile, signOut } = useAdminAuth()
  const { stats, loading, error } = useDashboardStats()

  const initials =
    profile?.full_name?.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) ??
    user?.email?.[0]?.toUpperCase() ??
    'A'

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      /* sin crujir la UI; el panel se cierra por sesión */
    }
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      {/* Perfil */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-space-md flex flex-col gap-space-sm">
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-primary/10 pointer-events-none blur-2xl" />
        <div className="flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-idp-navy text-on-primary flex items-center justify-center font-headline-md text-headline-md font-extrabold shadow-md">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold truncate">
              {profile?.full_name ?? user?.email ?? 'Administrador'}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {user?.email ?? '—'}
            </p>
          </div>
          <span className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-badge text-label-badge uppercase font-extrabold">
            {profile?.role ?? 'ORGANIZER'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-space-sm pt-space-xs">
          <span className="font-body-sm text-body-sm text-on-surface-variant inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Sesión activa
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-bold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold px-1">Resumen</h2>
        {loading ? (
          <LoadingState label="Cargando estadísticas…" rows={2} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <div className="grid grid-cols-2 gap-space-xs">
            <StatCard label="Participantes" value={stats.participants} icon="badge" />
            <StatCard label="Inscripciones" value={stats.registrations} icon="how_to_reg" />
            <StatCard label="Competencias activas" value={stats.competitions_active} icon="sports" />
            <StatCard label="Equipos" value={stats.teams} icon="groups" />
            <StatCard label="Partidos activos" value={stats.matches_pending} icon="schedule" />
            <StatCard label="Partidos jugados" value={stats.matches_completed} icon="sports_score" />
          </div>
        )}
      </section>

      {/* Acciones */}
      <section className="flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold px-1">Gestión</h2>
        <div className="flex flex-col gap-space-sm">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs p-space-md flex items-center gap-space-sm transition-transform active:scale-[0.98]"
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}`}>
                <span className="material-symbols-outlined text-[24px]">{a.icon}</span>
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-headline-sm text-[15px] text-on-surface font-bold">{a.title}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{a.subtitle}</span>
              </span>
              <span className="material-symbols-outlined text-on-surface-variant ml-auto flex-shrink-0">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md shadow-xs">
      <span className={`material-symbols-outlined text-[20px] ${value > 0 ? 'text-primary' : 'text-on-surface-variant/50'}`}>
        {icon}
      </span>
      <span className="font-score-display text-[26px] text-on-surface leading-none block font-extrabold mt-1">
        {value}
      </span>
      <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-tight block font-bold">
        {label}
      </span>
    </div>
  )
}