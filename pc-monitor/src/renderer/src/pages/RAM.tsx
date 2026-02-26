// src/renderer/src/pages/RAM.tsx
import { useState, useEffect } from 'react'
import { Database, Info } from 'lucide-react'
import Chart from '../components/Chart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { formatBytes, getUsageColor, getUsageBgColor } from '../utils/formatters'

interface ChartPoint { time: string; value: number }

function MemCard({
  label,
  hint,
  value,
  colorClass
}: {
  label: string
  hint: string
  value: string
  colorClass: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 mb-2 leading-tight">{hint}</p>
      <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
    </div>
  )
}

export default function RAM() {
  const { metric, loading } = useMetrics()
  const [history, setHistory] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (!metric) return
    setHistory((prev) => [
      ...prev.slice(-59),
      {
        time: new Date(metric.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        value: parseFloat(metric.ram.usagePercent.toFixed(1))
      }
    ])
  }, [metric])

  if (loading && !metric) return <LoadingSpinner />
  if (!metric) return <p className="text-slate-400 text-sm">No data yet…</p>

  const { ram } = metric
  const swapUsedPct = ram.swapTotal > 0 ? (ram.swapUsed / ram.swapTotal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">RAM</h1>
          <p className="text-sm text-slate-500">Random Access Memory — system working memory</p>
        </div>
      </div>

      {/* Main usage bar */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-xs font-semibold text-slate-300">Memory Usage</p>
            <p className="text-[11px] text-slate-500 mb-3">Proportion of total RAM actively in use by the OS and applications</p>
            <p className={`text-3xl font-bold font-mono ${getUsageColor(ram.usagePercent)}`}>
              {ram.usagePercent.toFixed(1)}%
            </p>
          </div>
          <p className="text-sm text-slate-400 font-mono">
            {formatBytes(ram.used)} / {formatBytes(ram.total)}
          </p>
        </div>
        <div className="w-full bg-slate-700/80 rounded-full h-2.5 mt-4">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${getUsageBgColor(ram.usagePercent)}`}
            style={{ width: `${Math.min(ram.usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MemCard
          label="Total"
          hint="Physical RAM installed in the system"
          value={formatBytes(ram.total)}
          colorClass="text-slate-100"
        />
        <MemCard
          label="Used"
          hint="Actively allocated by apps and the OS"
          value={formatBytes(ram.used)}
          colorClass={getUsageColor(ram.usagePercent)}
        />
        <MemCard
          label="Free"
          hint="Completely unused — OS keeps this low intentionally"
          value={formatBytes(ram.free)}
          colorClass="text-slate-100"
        />
        <MemCard
          label="Available"
          hint="Instantly reclaimable: free + cache that can be released"
          value={formatBytes(ram.available)}
          colorClass="text-green-400"
        />
      </div>

      {/* Free vs Available note */}
      <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">Free</strong> is memory with no purpose assigned.
          <strong className="text-slate-300"> Available</strong> is a better indicator of headroom —
          it includes free memory <em>plus</em> file system cache that the OS can reclaim instantly
          when an application needs more memory.
        </p>
      </div>

      {/* History chart */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Usage History
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Memory pressure sampled every 2 seconds over the last minute</p>
        </div>
        <Chart data={history} dataKey="value" xKey="time" color="#8b5cf6" label="RAM" height={180} />
      </div>

      {/* Swap */}
      {ram.swapTotal > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Swap / Virtual Memory</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Disk-backed overflow memory used when RAM is full. Much slower than physical RAM —
              high swap usage degrades system responsiveness.
            </p>
          </div>
          <div className="flex items-end justify-between mb-2">
            <p className={`text-xl font-bold font-mono ${getUsageColor(swapUsedPct)}`}>
              {swapUsedPct.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400 font-mono">
              {formatBytes(ram.swapUsed)} used · {formatBytes(ram.swapFree)} free
            </p>
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getUsageBgColor(swapUsedPct)}`}
              style={{ width: `${Math.min(swapUsedPct, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Total swap partition: {formatBytes(ram.swapTotal)}</p>
        </div>
      )}
    </div>
  )
}