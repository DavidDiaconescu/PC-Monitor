// src/renderer/src/pages/Alerts.tsx
import { useState, useEffect, useCallback } from 'react'
import { Trash2, ShieldCheck, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import { Alert } from '../types'
import { formatDateFull } from '../utils/formatters'

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    badge: 'bg-blue-900/50 text-blue-300 border border-blue-700',
    border: 'border-l-blue-500'
  },
  warning: {
    icon: AlertTriangle,
    badge: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
    border: 'border-l-yellow-500'
  },
  critical: {
    icon: AlertCircle,
    badge: 'bg-red-900/50 text-red-300 border border-red-700',
    border: 'border-l-red-500'
  }
}

function groupAlerts(alerts: Alert[]): Record<string, Alert[]> {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const groups: Record<string, Alert[]> = {}
  for (const alert of alerts) {
    const d = new Date(alert.timestamp).toDateString()
    const key = d === today ? 'Today' : d === yesterday ? 'Yesterday' : new Date(alert.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(alert)
  }
  return groups
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await window.electron.getRecentAlerts(50)
      setAlerts(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleClear = async () => {
    await window.electron.clearAlerts()
    setAlerts([])
    setConfirmClear(false)
  }

  if (loading) return <LoadingSpinner />

  const groups = groupAlerts(alerts)
  const groupKeys = Object.keys(groups)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Alerts</h1>
        {alerts.length > 0 && (
          <div className="flex items-center gap-3">
            {confirmClear ? (
              <>
                <span className="text-sm text-slate-400">Clear all {alerts.length} alerts?</span>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-16 h-16" />}
          message="No alerts — system is healthy."
        />
      ) : (
        <div className="space-y-8">
          {groupKeys.map((group) => (
            <div key={group}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {group}
              </h2>
              <div className="space-y-2">
                {groups[group].map((alert) => {
                  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
                  const Icon = cfg.icon
                  return (
                    <div
                      key={alert.id ?? alert.timestamp}
                      className={`bg-slate-800 rounded-xl p-4 border-l-4 ${cfg.border} flex gap-4`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-slate-100 text-sm">{alert.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{alert.message}</p>
                        <p className="text-xs text-slate-600 mt-1">{formatDateFull(alert.timestamp)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}