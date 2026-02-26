// src/renderer/src/pages/GPU.tsx
import { useState, useEffect } from 'react'
import { Zap, Info } from 'lucide-react'
import Chart from '../components/Chart'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { formatBytes, getUsageColor, getUsageBgColor, getTempColor, formatTemperature } from '../utils/formatters'

interface ChartPoint { time: string; value: number }

function StatCard({
  label,
  hint,
  value,
  colorClass = 'text-slate-100',
  sub
}: {
  label: string
  hint: string
  value: string
  colorClass?: string
  sub?: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 mb-2 leading-tight">{hint}</p>
      <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function GPU() {
  const { metric, loading } = useMetrics()
  const [history, setHistory] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (!metric?.gpu || metric.gpu.usage === null) return
    setHistory((prev) => [
      ...prev.slice(-59),
      {
        time: new Date(metric.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        value: parseFloat(metric.gpu!.usage!.toFixed(1))
      }
    ])
  }, [metric])

  if (loading && !metric) return <LoadingSpinner />

  if (!metric?.gpu) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold text-slate-100">GPU</h1>
        </div>
        <EmptyState icon={<Zap className="w-12 h-12" />} message="No GPU detected on this system." />
      </div>
    )
  }

  const { gpu } = metric
  const vramPct = gpu.memoryTotal && gpu.memoryUsed
    ? (gpu.memoryUsed / gpu.memoryTotal) * 100
    : null

  const isAppleSilicon = gpu.isIntegrated && gpu.vendor?.toLowerCase().includes('apple')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">GPU</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-slate-400">{gpu.name}</p>
            {gpu.isIntegrated && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Integrated</span>
            )}
            {gpu.vramDynamic && (
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">Unified Memory</span>
            )}
          </div>
        </div>
      </div>

      {/* Apple Silicon notice */}
      {isAppleSilicon && (
        <div className="flex gap-3 bg-blue-950/50 border border-blue-800/60 rounded-xl p-4">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-1">Apple Silicon — Limited GPU Telemetry</p>
            <p className="text-xs text-blue-400/80">
              Apple Silicon uses a unified memory architecture where the CPU and GPU share the same RAM pool.
              GPU utilization and temperature metrics require{' '}
              <code className="bg-blue-900/50 px-1 rounded">sudo powermetrics</code> and are not available
              without elevated permissions. Tools like <strong className="text-blue-300">iStatistica</strong> or{' '}
              <strong className="text-blue-300">GPU Monitor Pro</strong> use privileged helpers to expose these metrics.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Usage"
          hint="GPU shader core utilization"
          value={gpu.usage !== null ? `${gpu.usage.toFixed(1)}%` : 'N/A'}
          colorClass={gpu.usage !== null ? getUsageColor(gpu.usage) : 'text-slate-500'}
          sub={gpu.usage === null ? 'Not available on this system' : undefined}
        />
        <StatCard
          label="GPU Cores"
          hint="Number of parallel shader processing units"
          value={gpu.cores !== null ? gpu.cores.toString() : 'N/A'}
          colorClass="text-slate-100"
        />
        <StatCard
          label="Temperature"
          hint="GPU die temperature — throttles above ~90°C"
          value={gpu.temperature !== null ? formatTemperature(gpu.temperature) : 'N/A'}
          colorClass={gpu.temperature !== null ? getTempColor(gpu.temperature) : 'text-slate-500'}
          sub={gpu.temperature === null ? 'Not available on this system' : undefined}
        />
        <StatCard
          label="Fan Speed"
          hint="Cooling fan speed as a percentage of maximum RPM"
          value={gpu.fanSpeed !== null ? `${gpu.fanSpeed}%` : 'N/A'}
          colorClass="text-slate-100"
          sub={gpu.fanSpeed === null ? 'Passive cooling or not available' : undefined}
        />
      </div>

      {/* History chart */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Usage History</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">GPU load sampled every 2 seconds over the last minute</p>
        </div>
        {gpu.usage !== null ? (
          <Chart data={history} dataKey="value" xKey="time" color="#f59e0b" label="GPU" height={180} />
        ) : (
          <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
            Usage data not available on this system
          </div>
        )}
      </div>

      {/* VRAM */}
      {vramPct !== null && gpu.memoryTotal && gpu.memoryUsed ? (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">VRAM Usage</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dedicated video memory used for textures, frame buffers, and GPU computations
            </p>
          </div>
          <div className="flex items-end justify-between mb-2">
            <p className={`text-xl font-bold font-mono ${getUsageColor(vramPct)}`}>
              {vramPct.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400 font-mono">
              {formatBytes(gpu.memoryUsed * 1024 * 1024)} / {formatBytes(gpu.memoryTotal * 1024 * 1024)}
            </p>
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${getUsageBgColor(vramPct)}`}
              style={{ width: `${Math.min(vramPct, 100)}%` }}
            />
          </div>
        </div>
      ) : gpu.vramDynamic ? (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 mb-1">Video Memory</p>
          <p className="text-[11px] text-slate-500 mb-2">How GPU memory is managed on this system</p>
          <p className="text-sm text-slate-300">
            Unified memory — the GPU and CPU share the same physical RAM pool.
            There is no separate VRAM allocation; the GPU can use any portion of system memory as needed.
          </p>
        </div>
      ) : null}

      {/* Power draw */}
      {gpu.powerDraw !== null && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300">Power Draw</p>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Current electrical power consumption of the GPU</p>
          <p className="text-xl font-bold text-slate-100 font-mono">{gpu.powerDraw.toFixed(1)} W</p>
        </div>
      )}
    </div>
  )
}
