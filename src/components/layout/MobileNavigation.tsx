import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/lib/constants'

export function MobileNavigation() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-2px_12px_rgba(22,27,40,0.06)]">
      <div className="flex justify-around items-center h-16 px-space-xs">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-path={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-14 transition-colors min-w-[48px] ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="font-label-md text-label-md mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}