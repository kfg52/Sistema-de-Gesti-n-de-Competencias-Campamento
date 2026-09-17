import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useToast } from '@/components/ui/Toast'

export function AdminLogin() {
  const { signIn, signInWithGoogle } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Ingresa tu email y contraseña.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      toast('Sesión iniciada correctamente.')
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        message.includes('Invalid login credentials')
          ? 'Credenciales incorrectas. Verifica email y contraseña.'
          : message.includes('Email not confirmed')
            ? 'Tu email aún no está confirmado. Revísalo en tu bandeja de entrada.'
            : err instanceof Error
              ? err.message
              : 'No pudimos iniciar sesión. Intenta nuevamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogle = async () => {
    setGoogleBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar con Google. Revisa el proveedor en Supabase.',
      )
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg pt-space-md items-center">
      <div className="w-full max-w-sm flex flex-col gap-space-md">
        <div className="flex flex-col items-center gap-space-sm pt-space-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-md flex items-center justify-center p-1.5">
            <img
              alt="Logo IDP"
              className="w-full h-full object-contain"
              src="/images/iglesia-de-dios-de-la-profecia-logo.png"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-extrabold tracking-tight">
              Panel de administración
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              IDP Varones 2026 · Acceso restringido a personal autorizado
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-space-md flex flex-col gap-space-sm"
        >
          {error ? (
            <div className="rounded-lg bg-error-container/50 border border-error/30 px-space-md py-space-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px]">error</span>
              <span className="font-body-sm text-body-sm text-error font-medium">{error}</span>
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@idp.do"
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-1 focus:ring-primary-container shadow-inner"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Entrando…
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-outline-variant/40" />
          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">o</span>
          <span className="flex-1 h-px bg-outline-variant/40" />
        </div>

        <button
          type="button"
          disabled={googleBusy}
          onClick={onGoogle}
          className="h-11 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-label-lg text-label-lg text-on-surface font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {googleBusy ? (
            <span className="w-4 h-4 rounded-full border-2 border-on-surface/30 border-t-primary animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[20px] text-primary">g_mobiledata</span>
          )}
          Continuar con Google
        </button>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-1">
          ¿No tienes cuenta? El primer usuario se crea en <b>Supabase → Authentication</b>; su perfil
          se genera automáticamente como organizador.
        </p>
      </div>
    </div>
  )
}