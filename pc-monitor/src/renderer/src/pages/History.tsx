// src/renderer/src/pages/History.tsx
import { useState, useEffect, useMemo } from 'react'
import { Download } from 'lucide-react'
import Chart from '../components/Chart'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { Metric } from '../types'

type Range = '1h' | '6h' | '24h' | '7d' | '30d'
type MetricKey = 'cpu' | 'ram' | 'gpu' | 'disk'

const RANGES: { label: string; value: Range }[] = [
  { label: '1 Hour', value: '1h' },
  { label: '6 Hours', value: '6h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' }
]

const METRIC_TABS: { label: string; value: MetricKey }[] = [
  { label: 'CPU', value: 'cpu' },
  { label: 'RAM', value: 'ram' },
  { label: 'GPU', value: 'gpu' },
  { label: 'Disk', value: 'disk' }
]

function extractValue(m: Metric, key: MetricKey): number {
  switch (key) {
    case 'cpu':
      return m.cpu.usage
    case 'ram':
      return m.ram.usagePercent
    case 'gpu':
      return m.gpu?.usage ?? 0
    case 'disk': {
      const total = m.disk.reduce((s, d) => s + d.size, 0)
      const used = m.disk.reduce((s, d) => s + d.used, 0)
      return total > 0 ? (used / total) * 100 : 0
    }
  }
}

export default function History() {
  const [range, setRange] = useState<Range>('1h')
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('cpu')
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    window.electron
      .getMetricsHistory(range)
      .then((data) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [range])

  const chartData = useMemo(
    () =>
      metrics.map((m) => ({
        time: new Date(m.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        value: parseFloat(extractValue(m, selectedMetric).toFixed(1)),
        timestamp: m.timestamp
      })),
    [metrics, selectedMetric]
  )

  const values = chartData.map((d) => d.value)
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0
  const current = values.length ? values[values.length - 1] : 0

  const metricColor: Record<MetricKey, string> = {
    cpu: '#3b82f6',
    ram: '#8b5cf6',
    gpu: '#f59e0b',
    disk: '#10b981'
  }

  const exportCSV = () => {
    const rows = [
      ['Timestamp', 'Value (%)'],
      ...metrics.map((m) => [
        new Date(m.timestamp).toISOString(),
        extractValue(m, selectedMetric).toFixed(2)
      ])
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pc-monitor-${selectedMetric}-${range}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">History</h1>
        <button
          onClick={exportCSV}
          disabled={metrics.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-sm rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 flex-wrap">
        {RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Metric tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {METRIC_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setSelectedMetric(value)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              selectedMetric === value
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Average', value: `${avg.toFixed(1)}%` },
          { label: 'Maximum', value: `${max.toFixed(1)}%` },
          { label: 'Minimum', value: `${min.toFixed(1)}%` },
          { label: 'Current', value: `${current.toFixed(1)}%` }
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-slate-800 rounded-xl p-5">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={<Download className="w-12 h-12" />}
            message="No data for this time range yet."
          />
        ) : (
          <Chart
            data={chartData}
            dataKey="value"
            xKey="time"
            color={metricColor[selectedMetric]}
            label={selectedMetric.toUpperCase()}
            height={400}
          />
        )}
      </div>
    </div>
  )
}