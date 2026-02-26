// src/renderer/src/pages/Temperature.tsx
import { useState, useEffect } from 'react'
import { Thermometer, AlertTriangle, Info } from 'lucide-react'
import Chart from '../components/Chart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { getTempColor, formatTemperature } from '../utils/formatters'

interface ChartPoint { time: string; cpu: number }

function TempBar({ label, temp, max = 110 }: { label: string; temp: number; max?: number }) {
  const pct = Math.min((temp / max) * 100, 100)
  const barColor = temp >= 85 ? 'bg-red-500' : temp >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-semibold font-mono ${getTempColor(temp)}`}>
          {formatTemperature(temp)}
        </span>
      </div>
      <div className="w-full bg-slate-700/80 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TempCard({
  label,
  hint,
  temp
}: {
  label: string
  hint: string
  temp: number | null
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 mb-2 leading-tight">{hint}</p>
      <p className={`text-xl font-bold font-mono ${temp !== null ? getTempColor(temp) : 'text-slate-600'}`}>
        {temp !== null ? formatTemperature(temp) : 'N/A'}
      </p>
      {temp !== null && (
        <p className="text-[11px] mt-1">
          <span className={temp >= 85 ? 'text-red-400' : temp >= 70 ? 'text-yellow-400' : 'text-green-400'}>
            {temp >= 85 ? 'Hot — may throttle' : temp >= 70 ? 'Warm — monitor closely' : 'Normal range'}
          </span>
        </p>
      )}
    </div>
  )
}

export default function Temperature() {
  const { metric, loading } = useMetrics()
  const [history, setHistory] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (!metric?.temperature) return
    const t = metric.temperature
    if (t.cpu === null) return
    setHistory((prev) => [
      ...prev.slice(-59),
      {
        time: new Date(metric.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        cpu: t.cpu!
      }
    ])
  }, [metric])

  if (loading && !metric) return <LoadingSpinner />
  if (!metric) return <p className="text-slate-400 text-sm">No data yet…</p>

  const temp = metric.temperature

  // Determine what's available
  const cpuAvail = temp?.cpu !== null && temp?.cpu !== undefined
  const gpuAvail = temp?.gpu !== null && temp?.gpu !== undefined
  const mbAvail = temp?.motherboard !== null && temp?.motherboard !== undefined
  const nvmeAvail = temp?.nvme !== null && temp?.nvme !== undefined
  const coresAvail = (temp?.cores?.length ?? 0) > 0
  const anySensorAvail = cpuAvail || gpuAvail || mbAvail || nvmeAvail || coresAvail

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Thermometer className="w-6 h-6 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Temperature</h1>
          <p className="text-sm text-slate-500">Thermal sensors for CPU, GPU, motherboard and storage</p>
        </div>
      </div>

      {/* Sensor availability notice */}
      {!anySensorAvail ? (
        <>
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
            <div>
              <p className="text-slate-200 font-semibold mb-1">Temperature sensors not accessible</p>
              <p className="text-sm text-slate-500 max-w-md">
                Thermal sensor access requires elevated permissions or vendor-specific drivers
                that are not available in this context.
              </p>
            </div>
          </div>
          <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Alternative tools for temperature monitoring:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li><strong className="text-slate-300">HWiNFO64</strong> — comprehensive hardware monitor for Windows</li>
                <li><strong className="text-slate-300">Core Temp</strong> — CPU temperature monitoring for Windows</li>
                <li><strong className="text-slate-300">MSI Afterburner</strong> — GPU temperature and usage for Windows</li>
                <li><strong className="text-slate-300">iStatistica / TG Pro</strong> — for macOS with SMC sensor access</li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Temp range legend */}
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Normal (&lt;70°C)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Warm (70–85°C)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Hot / Throttling (&gt;85°C)</span>
          </div>

          {/* Main sensor cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <TempCard
              label="CPU"
              hint="Processor package temperature — max safe ~95°C"
              temp={temp?.cpu ?? null}
            />
            <TempCard
              label="GPU"
              hint="Graphics processor die temperature"
              temp={temp?.gpu ?? null}
            />
            <TempCard
              label="Motherboard"
              hint="System board ambient temperature sensor"
              temp={temp?.motherboard ?? null}
            />
            <TempCard
              label="NVMe SSD"
              hint="Storage drive controller temperature — max safe ~70°C"
              temp={temp?.nvme ?? null}
            />
          </div>

          {/* CPU history chart */}
          {cpuAvail && history.length > 2 && (
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <div className="mb-3">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  CPU Temperature History
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Processor temperature over the last minute. Sustained temps above 90°C may cause throttling.
                </p>
              </div>
              <Chart
                data={history}
                dataKey="cpu"
                xKey="time"
                color="#ef4444"
                label="CPU Temp"
                height={160}
                unit="°C"
                domain={[0, 110]}
              />
            </div>
          )}

          {/* Per-core temperatures */}
          {coresAvail && (
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <div className="mb-4">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  CPU Core Temperatures
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Individual thermal reading per core. Uneven temps can indicate thermal paste issues or airflow problems.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {temp!.cores.map((t, i) => (
                  <TempBar key={i} label={`Core ${i}`} temp={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}