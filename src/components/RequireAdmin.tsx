import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { LoadingState } from '@/components/ui/LoadingState'

/** Guard de rutas administrativas: exige sesión con rol admin/organizador. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Verificando acceso…" rows={3} />
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

/** Si ya hay sesión admin, la pantalla de login redirige al panel. */
export function RedirectIfAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdminAuth()

  if (loading) return <LoadingState label="Verificando sesión…" rows={2} />
  if (isAdmin) return <Navigate to="/admin" replace />

  return <>{children}</>
}