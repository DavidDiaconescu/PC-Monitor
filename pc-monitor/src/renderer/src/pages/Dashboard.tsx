// src/renderer/src/pages/Dashboard.tsx
import { useState, useEffect } from 'react'
import { Cpu, Database, Zap, HardDrive } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import Chart from '../components/Chart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { formatBytes } from '../utils/formatters'

interface ChartPoint {
  time: string
  cpu: number
  ram: number
  gpu: number
  disk: number
}

function ChartCard({
  title,
  description,
  data,
  dataKey,
  color,
  label
}: {
  title: string
  description?: string
  data: ChartPoint[]
  dataKey: string
  color: string
  label: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
        {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      <Chart data={data} dataKey={dataKey} xKey="time" color={color} label={label} height={150} />
    </div>
  )
}

export default function Dashboard() {
  const { metric, loading } = useMetrics()
  const [history, setHistory] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (!metric) return
    const diskUsed = metric.disk.reduce((s, d) => s + d.used, 0)
    const diskTotal = metric.disk.reduce((s, d) => s + d.size, 0)
    const diskPct = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0
    setHistory((prev) => [
      ...prev.slice(-49),
      {
        time: new Date(metric.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        cpu: parseFloat(metric.cpu.usage.toFixed(1)),
        ram: parseFloat(metric.ram.usagePercent.toFixed(1)),
        gpu: metric.gpu?.usage != null ? parseFloat(metric.gpu.usage.toFixed(1)) : 0,
        disk: parseFloat(diskPct.toFixed(1))
      }
    ])
  }, [metric])

  if (loading && !metric) return <LoadingSpinner />
  if (!metric)
    return (
      <p className="text-slate-400 text-sm">No metrics yet — waiting for first collection…</p>
    )

  const diskUsed = metric.disk.reduce((s, d) => s + d.used, 0)
  const diskTotal = metric.disk.reduce((s, d) => s + d.size, 0)
  const diskPct = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time system performance overview</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="CPU"
          description="Processor load across all cores"
          value={metric.cpu.usage}
          unit="%"
          icon={<Cpu className="w-5 h-5 text-blue-400" />}
          max={100}
          subtitle={metric.cpu.speed > 0 ? `${metric.cpu.speed.toFixed(1)} GHz` : undefined}
        />
        <MetricCard
          title="RAM"
          description="Memory actively in use"
          value={metric.ram.usagePercent}
          unit="%"
          icon={<Database className="w-5 h-5 text-purple-400" />}
          max={100}
          subtitle={`${formatBytes(metric.ram.used)} / ${formatBytes(metric.ram.total)}`}
        />
        <MetricCard
          title="GPU"
          description="Graphics processor utilization"
          value={metric.gpu?.usage ?? null}
          unit="%"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          max={100}
          subtitle={metric.gpu ? metric.gpu.name : 'No GPU detected'}
        />
        <MetricCard
          title="Disk"
          description="Storage capacity consumed"
          value={diskPct}
          unit="%"
          icon={<HardDrive className="w-5 h-5 text-green-400" />}
          max={100}
          subtitle={`${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}`}
        />
      </div>

      {/* 4 live charts */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="CPU Usage"
          description="Processor load over the last minute"
          data={history}
          dataKey="cpu"
          color="#3b82f6"
          label="CPU"
        />
        <ChartCard
          title="RAM Usage"
          description="Memory utilization over the last minute"
          data={history}
          dataKey="ram"
          color="#8b5cf6"
          label="RAM"
        />
        <ChartCard
          title="GPU Usage"
          description="Graphics load over the last minute"
          data={history}
          dataKey="gpu"
          color="#f59e0b"
          label="GPU"
        />
        <ChartCard
          title="Disk Usage"
          description="Storage occupancy over the last minute"
          data={history}
          dataKey="disk"
          color="#10b981"
          label="Disk"
        />
      </div>
    </div>
  )
}