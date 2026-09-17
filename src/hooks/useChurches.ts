import { useEffect, useState } from 'react'
import { getChurches } from '@/services/churches'
import type { Church } from '@/types'

export function useChurches() {
  const [churches, setChurches] = useState<Church[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getChurches()
      .then((data) => {
        if (!active) return
        setChurches(data)
        setError(null)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las iglesias. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { churches, loading, error }
}