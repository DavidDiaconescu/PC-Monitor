// src/renderer/src/hooks/useSettings.ts
import { useState, useEffect } from 'react'
import { Settings } from '../types'

interface UseSettingsReturn {
  settings: Settings | null
  loading: boolean
  saveSettings: (s: Settings) => Promise<void>
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electron
      .getSettings()
      .then((s) => {
        setSettings(s)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const saveSettings = async (s: Settings): Promise<void> => {
    await window.electron.updateSettings(s)
    setSettings(s)
  }

  return { settings, loading, saveSettings }
}