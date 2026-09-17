import { useEffect, useState } from 'react'
import { getDashboardStats } from '@/services/stats'
import type { DashboardStats } from '@/types'

const EMPTY: DashboardStats = {
  participants: 0,
  registrations: 0,
  competitions_active: 0,
  teams: 0,
  matches_pending: 0,
  matches_completed: 0,
  competitions_finished: 0,
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getDashboardStats()
      .then((data) => {
        if (!active) return
        setStats(data)
        setError(null)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las estadísticas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { stats, loading, error }
}