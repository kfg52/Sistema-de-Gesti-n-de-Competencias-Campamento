import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getParticipantByToken } from '@/services/participants'
import { PARTICIPANT_TOKEN_KEY } from '@/lib/constants'
import type { ParticipantWithChurch } from '@/types'

/**
 * Obtiene el participante identificado por el QR/token.
 * Fuentes: query param `t` (QR) o el token guardado tras el registro.
 * Cuando nadie está identificado devuelve null.
 */
export function useParticipant() {
  const [searchParams] = useSearchParams()
  const [participant, setParticipant] = useState<ParticipantWithChurch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('t') ?? localStorage.getItem(PARTICIPANT_TOKEN_KEY)

  useEffect(() => {
    let active = true

    if (!token) {
      setLoading(false)
      setParticipant(null)
      return
    }

    ;(async () => {
      try {
        const found = await getParticipantByToken(token)
        if (!active) return
        if (found) {
          setParticipant(found)
          localStorage.setItem(PARTICIPANT_TOKEN_KEY, found.participant_token)
        } else {
          setParticipant(null)
        }
        setError(null)
      } catch {
        if (active) setError('No pudimos identificar tu código QR.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [token])

  return { participant, loading, error }
}