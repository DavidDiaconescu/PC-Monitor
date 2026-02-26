// src/renderer/src/hooks/useMetrics.ts
import { useState, useEffect } from 'react'
import { Metric } from '../types'

interface UseMetricsReturn {
  metric: Metric | null
  loading: boolean
  error: string | null
}

export function useMetrics(): UseMetricsReturn {
  const [metric, setMetric] = useState<Metric | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch the most recent stored metric immediately
    window.electron
      .getLatestMetrics()
      .then((m) => {
        if (m) setMetric(m)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })

    // Subscribe to real-time pushes; returns cleanup function
    const cleanup = window.electron.onMetricUpdate((m) => {
      setMetric(m)
      setLoading(false)
      setError(null)
    })

    return cleanup
  }, [])

  return { metric, loading, error }
}