import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import {
  getProfile,
  getSessionUser,
  roleIsAdmin,
  signInWithGoogle,
  signInWithPassword,
  signOutApp,
} from '@/lib/auth'
import type { Profile } from '@/types'

export interface AdminUser {
  id: string
  email: string | null
}

interface AdminAuthContextValue {
  user: AdminUser | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    try {
      const p = await getProfile(user.id)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }, [user])

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null

    // Reactividad ante cambios de sesión (login/logout/refresh).
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null)
        setLoading(false)
      })
      unsubscribe = data.subscription.unsubscribe
    }

    ;(async () => {
      try {
        const u = await getSessionUser()
        if (!active) return
        setUser(u)
        if (u) {
          const p = await getProfile(u.id)
          if (active) setProfile(p)
        } else {
          setProfile(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (user) void refreshProfile()
  }, [user, refreshProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await signInWithPassword(email, password)
    const session = u ? { id: u.id, email: u.email ?? null } : null
    setUser(session)
    setLoading(false)
    // Carga el perfil antes de devolver el control para que el guard
    // ya disponga del rol al navegar hacia /admin.
    setProfile(session ? await getProfile(session.id).catch(() => null) : null)
  }, [])

  const signInGoogle = useCallback(async () => {
    await signInWithGoogle()
  }, [])

  const signOut = useCallback(async () => {
    await signOutApp()
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin: roleIsAdmin(profile?.role),
      loading,
      signIn,
      signInWithGoogle: signInGoogle,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signIn, signInGoogle, signOut, refreshProfile],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de AuthProvider')
  return ctx
}