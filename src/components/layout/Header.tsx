import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
      <div className="h-20 px-gutter flex items-center justify-between gap-space-sm">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center p-1 shadow-sm flex-shrink-0">
            <img
              alt="Logo Iglesia de Dios de la Profecía"
              className="w-full h-full object-contain"
              src="/images/iglesia-de-dios-de-la-profecia-logo.png"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-[15px] text-on-surface font-bold truncate leading-tight tracking-tight">
              IDP VARONES 2026
            </span>
            <span className="font-label-badge text-[10px] text-primary uppercase tracking-wider font-extrabold truncate">
              Iglesia de Dios de la Profecía
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-space-xs flex-shrink-0">
          <div className="flex items-center bg-surface-container-high rounded-full p-0.5 shadow-inner">
            <Link
              to="/"
              className="px-2.5 py-1 rounded-full text-on-primary bg-primary font-label-md text-label-md flex items-center gap-1 shadow-xs transition-all h-8"
            >
              <span className="material-symbols-outlined text-[14px]">sports_handball</span>
              <span>Camp</span>
            </Link>
            <Link
              to="/admin"
              className="px-2.5 py-1 rounded-full text-on-surface-variant font-label-md text-label-md flex items-center gap-1 hover:text-on-surface transition-all h-8"
            >
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>Admin</span>
            </Link>
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 shadow-sm ml-1 text-on-primary">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}