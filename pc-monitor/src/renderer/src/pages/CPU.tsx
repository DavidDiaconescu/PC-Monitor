// src/renderer/src/pages/CPU.tsx
import { useState, useEffect } from 'react'
import { Cpu, Info } from 'lucide-react'
import Chart from '../components/Chart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { getUsageColor, getUsageBgColor, getTempColor, formatTemperature } from '../utils/formatters'

interface ChartPoint { time: string; value: number }

function StatCard({
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
      <p className="text-[11px] text-slate-500 mt-0.5 mb-2">{hint}</p>
      <p className={`text-xl font-bold font-mono ${colorClass}`}>{value}</p>
    </div>
  )
}

function UsageBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-semibold font-mono ${getUsageColor(value)}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-slate-700/80 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${getUsageBgColor(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function CPU() {
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
        value: parseFloat(metric.cpu.usage.toFixed(1))
      }
    ])
  }, [metric])

  if (loading && !metric) return <LoadingSpinner />
  if (!metric) return <p className="text-slate-400 text-sm">No data yet…</p>

  const { cpu } = metric

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Cpu className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">CPU</h1>
          <p className="text-sm text-slate-500">Central Processing Unit performance</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Usage"
          hint="Combined load across all processor cores"
          value={`${cpu.usage.toFixed(1)}%`}
          colorClass={getUsageColor(cpu.usage)}
        />
        <StatCard
          label="Clock Speed"
          hint="Current operating frequency of the processor"
          value={cpu.speed > 0 ? `${cpu.speed.toFixed(2)} GHz` : '—'}
          colorClass="text-slate-100"
        />
        <StatCard
          label="Temperature"
          hint="CPU package temp — requires sudo on Apple Silicon"
          value={cpu.temperature !== null ? formatTemperature(cpu.temperature) : 'N/A'}
          colorClass={cpu.temperature !== null ? getTempColor(cpu.temperature) : 'text-slate-500'}
        />
      </div>

      {/* Note if temp unavailable */}
      {cpu.temperature === null && (
        <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">
            CPU temperature sensors are not accessible on this system. On Windows, you can use{' '}
            <strong className="text-slate-300">HWiNFO64</strong> or{' '}
            <strong className="text-slate-300">Core Temp</strong> for detailed thermal readings.
            On macOS Apple Silicon, temperature requires{' '}
            <code className="bg-slate-700 px-1 rounded">sudo powermetrics</code> or a tool like{' '}
            <strong className="text-slate-300">iStatistica</strong>.
          </p>
        </div>
      )}

      {/* History chart */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Usage History
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">CPU load sampled every 2 seconds over the last minute</p>
        </div>
        <Chart data={history} dataKey="value" xKey="time" color="#3b82f6" label="CPU" height={180} />
      </div>

      {/* Per-core usage */}
      {cpu.usagePerCore.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Per-Core Usage
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Load on each logical CPU core — {cpu.usagePerCore.length} cores total.
              High sustained load on all cores may indicate a bottleneck.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {cpu.usagePerCore.map((usage, i) => (
              <UsageBar key={i} label={`Core ${i}`} value={usage} />
            ))}
          </div>
        </div>
      )}

      {/* Per-core temperatures */}
      {cpu.temperaturePerCore.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Core Temperatures
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Individual thermal readings per core. Safe range: &lt;80°C. Throttling begins at ~95°C.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {cpu.temperaturePerCore.map((temp, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Core {i}</span>
                <span className={`text-xs font-semibold font-mono ${getTempColor(temp)}`}>
                  {formatTemperature(temp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}