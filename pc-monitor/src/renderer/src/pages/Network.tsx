// src/renderer/src/pages/Network.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Wifi, ArrowDown, ArrowUp, Signal, RefreshCw, Gauge, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Chart from '../components/Chart'
import { NetworkStats } from '../types'
import { formatBytes, formatSpeed, bytesToMB } from '../utils/formatters'

const MAX_HISTORY = 60

type HistoryPoint = { time: string; download: number; upload: number }

interface SpeedTestState {
  running: boolean
  phase?: 'latency' | 'download' | 'upload' | 'done' | 'error'
  progress: number
  latency?: number
  downloadMbps?: number
  uploadMbps?: number
  error?: string
}

const PHASE_LABELS: Record<string, string> = {
  latency: 'Measuring latency…',
  download: 'Testing download speed…',
  upload: 'Testing upload speed…',
  done: 'Complete',
  error: 'Error'
}

function pingColor(ms: number | null): string {
  if (ms === null) return 'text-slate-500'
  if (ms > 150) return 'text-red-400'
  if (ms > 60) return 'text-yellow-400'
  return 'text-green-400'
}

function pingLabel(ms: number | null): string {
  if (ms === null) return 'No signal'
  if (ms > 150) return 'High latency'
  if (ms > 60) return 'Moderate'
  return 'Good'
}

function StatCard({
  icon,
  label,
  hint,
  value,
  sub,
  valueClass
}: {
  icon: React.ReactNode
  label: string
  hint: string
  value: string
  sub: string
  valueClass: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-0.5">
        {icon}
        <span className="text-xs font-semibold text-slate-300">{label}</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">{hint}</p>
      <p className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  )
}

export default function Network() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const fetchingRef = useRef(false)
  const [speedTest, setSpeedTest] = useState<SpeedTestState>({ running: false, progress: 0 })

  const handleRunSpeedTest = useCallback(async () => {
    setSpeedTest({ running: true, progress: 0 })
    const cleanup = window.electron.onSpeedTestProgress((update) => {
      setSpeedTest({
        running: update.phase !== 'done' && update.phase !== 'error',
        phase: update.phase,
        progress: update.progress,
        latency: update.latency,
        downloadMbps: update.downloadMbps,
        uploadMbps: update.uploadMbps,
        error: update.error
      })
    })
    try {
      await window.electron.runSpeedTest()
    } catch {
      setSpeedTest((prev) => ({ ...prev, running: false, phase: 'error', error: 'Speed test failed' }))
    } finally {
      cleanup()
    }
  }, [])

  const fetchStats = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const data = await window.electron.getNetwork()
      setStats(data)
      setLoading(false)

      const totalDown = data.interfaces.reduce((s, i) => s + i.downloadSpeed, 0)
      const totalUp = data.interfaces.reduce((s, i) => s + i.uploadSpeed, 0)
      setHistory((prev) => [
        ...prev.slice(-(MAX_HISTORY - 1)),
        {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          download: parseFloat(bytesToMB(totalDown).toFixed(3)),
          upload: parseFloat(bytesToMB(totalUp).toFixed(3))
        }
      ])
    } catch {
      setLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchStats, 2000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchStats])

  if (loading) return <LoadingSpinner />

  if (!stats) {
    return (
      <EmptyState
        icon={<Wifi className="w-12 h-12" />}
        message="No network data available."
        action={{ label: 'Retry', onClick: fetchStats }}
      />
    )
  }

  const totalDown = stats.interfaces.reduce((s, i) => s + i.downloadSpeed, 0)
  const totalUp = stats.interfaces.reduce((s, i) => s + i.uploadSpeed, 0)
  const totalRx = stats.interfaces.reduce((s, i) => s + i.downloadTotal, 0)
  const totalTx = stats.interfaces.reduce((s, i) => s + i.uploadTotal, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Network</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time bandwidth and interface statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-blue-500"
            />
            Live (2s)
          </label>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<ArrowDown className="w-5 h-5 text-blue-400" />}
          label="Download"
          hint="Incoming data throughput across all active interfaces"
          value={formatSpeed(totalDown)}
          sub={`Session total received: ${formatBytes(totalRx)}`}
          valueClass="text-blue-400"
        />
        <StatCard
          icon={<ArrowUp className="w-5 h-5 text-emerald-400" />}
          label="Upload"
          hint="Outgoing data throughput across all active interfaces"
          value={formatSpeed(totalUp)}
          sub={`Session total sent: ${formatBytes(totalTx)}`}
          valueClass="text-emerald-400"
        />
        <StatCard
          icon={<Signal className={`w-5 h-5 ${pingColor(stats.ping)}`} />}
          label="Ping (Latency)"
          hint="Round-trip time to 8.8.8.8 — measures internet responsiveness"
          value={stats.ping !== null ? `${stats.ping} ms` : '—'}
          sub={pingLabel(stats.ping)}
          valueClass={pingColor(stats.ping)}
        />
      </div>

      {/* Live charts */}
      {history.length > 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Download Speed (MB/s)
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Incoming throughput over the last minute</p>
            <Chart
              data={history}
              dataKey="download"
              xKey="time"
              color="#3b82f6"
              label="MB/s"
              height={160}
              unit=" MB/s"
              domain={[0, Math.max(...history.map((h) => h.download)) * 1.2 || 0.1]}
            />
          </div>
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Upload Speed (MB/s)
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Outgoing throughput over the last minute</p>
            <Chart
              data={history}
              dataKey="upload"
              xKey="time"
              color="#10b981"
              label="MB/s"
              height={160}
              unit=" MB/s"
              domain={[0, Math.max(...history.map((h) => h.upload)) * 1.2 || 0.1]}
            />
          </div>
        </div>
      )}

      {/* Speed Test */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              Speed Test
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ookla-style test — 4 parallel streams to Cloudflare (100 MB download, 40 MB upload)
            </p>
          </div>
          <button
            onClick={handleRunSpeedTest}
            disabled={speedTest.running}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {speedTest.running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Gauge className="w-4 h-4" />
                Run Speed Test
              </>
            )}
          </button>
        </div>

        {/* Progress bar (shown while running) */}
        {speedTest.running && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{speedTest.phase ? PHASE_LABELS[speedTest.phase] : 'Preparing…'}</span>
              <span className="font-mono">{speedTest.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${speedTest.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {speedTest.phase === 'error' && (
          <p className="text-sm text-red-400 mt-2">{speedTest.error ?? 'Speed test failed. Check your internet connection.'}</p>
        )}
        {speedTest.phase === 'done' && (
          <div className="grid grid-cols-3 gap-4 mt-1">
            <div className="bg-slate-900/60 rounded-lg p-4 text-center">
              <Signal className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Latency</p>
              <p className="text-xl font-bold font-mono text-yellow-400">
                {speedTest.latency != null ? `${speedTest.latency} ms` : '—'}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">median of 5 pings</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-4 text-center">
              <ArrowDown className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Download</p>
              <p className="text-xl font-bold font-mono text-blue-400">
                {speedTest.downloadMbps != null ? `${speedTest.downloadMbps.toFixed(1)} Mbps` : '—'}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">4 parallel streams</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-4 text-center">
              <ArrowUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Upload</p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {speedTest.uploadMbps != null ? `${speedTest.uploadMbps.toFixed(1)} Mbps` : '—'}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">4 parallel streams</p>
            </div>
          </div>
        )}

        {/* Idle hint */}
        {!speedTest.running && speedTest.phase == null && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle className="w-3.5 h-3.5 text-slate-600" />
            Press "Run Speed Test" to measure your internet connection speed
          </div>
        )}
      </div>

      {/* Interface table */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Network Interfaces ({stats.interfaces.length})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">All detected network adapters — only active interfaces have live traffic</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              {['Interface', 'Download', 'Upload', 'Total Rx', 'Total Tx', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {stats.interfaces.map((iface) => {
              const active = iface.downloadSpeed > 0 || iface.uploadSpeed > 0
              return (
                <tr
                  key={iface.interface}
                  className={`transition-colors hover:bg-slate-700/30 ${active ? '' : 'opacity-40'}`}
                >
                  <td className="px-4 py-3 font-mono text-slate-200 font-medium">
                    {iface.interface}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-400">
                    {formatSpeed(iface.downloadSpeed)}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    {formatSpeed(iface.uploadSpeed)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {formatBytes(iface.downloadTotal)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {formatBytes(iface.uploadTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        active
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {active ? 'Active' : 'Idle'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}