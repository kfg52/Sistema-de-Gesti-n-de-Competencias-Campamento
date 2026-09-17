import { useEffect, useState } from 'react'
import { getActiveCompetitionsWithStats } from '@/services/competitions'
import type { CompetitionWithStats } from '@/types'

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<CompetitionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getActiveCompetitionsWithStats()
      .then((data) => {
        if (!active) return
        setCompetitions(data)
        setError(null)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las competencias. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { competitions, loading, error }
}