// src/renderer/src/pages/Battery.tsx
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Monitor } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { BatteryMetric } from '../types'

function batteryIcon(b: BatteryMetric) {
  if (b.isCharging || b.acConnected) return <BatteryCharging className="w-8 h-8 text-green-400" />
  if (b.percent >= 75) return <BatteryFull className="w-8 h-8 text-green-400" />
  if (b.percent >= 40) return <BatteryMedium className="w-8 h-8 text-yellow-400" />
  if (b.percent <= 20) return <BatteryLow className="w-8 h-8 text-red-400" />
  return <Battery className="w-8 h-8 text-yellow-400" />
}

function batteryBarColor(percent: number): string {
  if (percent >= 60) return 'bg-green-500'
  if (percent >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

function batteryTextColor(percent: number): string {
  if (percent >= 60) return 'text-green-400'
  if (percent >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

function healthColor(health: number): string {
  if (health >= 85) return 'text-green-400'
  if (health >= 70) return 'text-yellow-400'
  return 'text-red-400'
}

function healthBarColor(health: number): string {
  if (health >= 85) return 'bg-green-500'
  if (health >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'N/A'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function DetailCard({
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-200 font-medium text-sm">{value}</p>
    </div>
  )
}

export default function BatteryPage() {
  const { metric, loading } = useMetrics()

  if (loading && !metric) return <LoadingSpinner />
  if (!metric) return <p className="text-slate-400 text-sm">No data yet…</p>

  const battery = metric.battery ?? null

  if (!battery || !battery.hasBattery) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Battery className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-100">Battery</h1>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
          <Monitor className="w-12 h-12 text-slate-600" />
          <div>
            <p className="text-slate-300 font-medium">No battery detected</p>
            <p className="text-sm text-slate-500 mt-1">This appears to be a desktop system or the battery is not accessible.</p>
          </div>
        </div>
      </div>
    )
  }

  const status = battery.isCharging
    ? 'Charging'
    : battery.acConnected
      ? 'AC Connected (Fully charged)'
      : `Discharging — ${formatMinutes(battery.timeRemaining)} remaining`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {batteryIcon(battery)}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Battery</h1>
          <p className="text-sm text-slate-400">{status}</p>
        </div>
      </div>

      {/* Big charge indicator */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-xs font-semibold text-slate-300">Charge Level</p>
            <p className="text-[11px] text-slate-500 mb-3">Current battery charge as a percentage of maximum capacity</p>
            <p className={`text-5xl font-bold font-mono ${batteryTextColor(battery.percent)}`}>
              {battery.percent}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-300">{battery.isCharging ? '⚡ Charging' : 'On Battery'}</p>
            {battery.timeRemaining !== null && !battery.isCharging && (
              <p className="text-xs text-slate-500 mt-1">{formatMinutes(battery.timeRemaining)} remaining</p>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-700/80 rounded-full h-4 overflow-hidden mt-4">
          <div
            className={`h-4 rounded-full transition-all duration-700 ${batteryBarColor(battery.percent)} ${battery.isCharging ? 'animate-pulse' : ''}`}
            style={{ width: `${battery.percent}%` }}
          />
        </div>
      </div>

      {/* Battery health */}
      {battery.health !== null && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-300 mb-0.5">Battery Health</p>
          <p className="text-[11px] text-slate-500 mb-4">
            Capacity retention — current max charge ÷ original design capacity × 100.
            This measures how much the battery has degraded from wear.
            New batteries start at 100%; replace when it drops below ~80%.
          </p>
          <div className="flex items-end justify-between mb-3">
            <p className={`text-2xl font-bold font-mono ${healthColor(battery.health)}`}>
              {battery.health}%
            </p>
            {battery.designedCapacity && battery.maxCapacity && (
              <p className="text-xs text-slate-500 text-right">
                {battery.maxCapacity.toLocaleString()} / {battery.designedCapacity.toLocaleString()} {battery.capacityUnit}
              </p>
            )}
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${healthBarColor(battery.health)}`}
              style={{ width: `${battery.health}%` }}
            />
          </div>
          <p className="text-xs mt-2">
            <span className={
              battery.health >= 85 ? 'text-green-400' :
              battery.health >= 70 ? 'text-yellow-400' :
              'text-red-400'
            }>
              {battery.health >= 85 ? '✓ Excellent — battery is in great shape' :
               battery.health >= 70 ? '⚠ Good — some wear, consider monitoring' :
               '✕ Degraded — consider battery replacement'}
            </span>
          </p>
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <DetailCard
          label="Cycle Count"
          hint="Full charge/discharge cycles completed — higher means more wear. MacBook batteries are rated for ~1000 cycles."
          value={battery.cycleCount !== null ? battery.cycleCount.toString() : 'N/A'}
          colorClass={
            battery.cycleCount === null ? 'text-slate-500' :
            battery.cycleCount > 800 ? 'text-red-400' :
            battery.cycleCount > 500 ? 'text-yellow-400' :
            'text-green-400'
          }
        />
        <DetailCard
          label="Voltage"
          hint="Current battery cell voltage. MacBook batteries typically operate between 7.5–8.4V depending on charge level."
          value={battery.voltage !== null ? `${battery.voltage.toFixed(3)} V` : 'N/A'}
          colorClass="text-slate-100"
        />
        <DetailCard
          label="Time Remaining"
          hint="Estimated time until fully drained at the current power draw rate. N/A when charging or fully charged."
          value={formatMinutes(battery.timeRemaining)}
          colorClass="text-slate-100"
        />
        {battery.currentCapacity != null && (
          <DetailCard
            label={`Current Charge (${battery.capacityUnit})`}
            hint="Energy actually stored in the battery right now"
            value={battery.currentCapacity.toLocaleString()}
            colorClass="text-slate-100"
          />
        )}
        {battery.maxCapacity != null && (
          <DetailCard
            label={`Max Capacity (${battery.capacityUnit})`}
            hint="The highest charge this battery can currently hold after wear. Decreases over time and charge cycles."
            value={battery.maxCapacity.toLocaleString()}
            colorClass="text-slate-100"
          />
        )}
        {battery.designedCapacity != null && (
          <DetailCard
            label={`Designed Capacity (${battery.capacityUnit})`}
            hint="The original full charge capacity specified by the manufacturer when the battery was new."
            value={battery.designedCapacity.toLocaleString()}
            colorClass="text-slate-100"
          />
        )}
      </div>

      {/* Info row */}
      {(battery.type || battery.manufacturer || battery.model) && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Battery Info</p>
          <div className="flex gap-6 flex-wrap">
            {battery.type && <InfoItem label="Chemistry" value={battery.type} />}
            {battery.manufacturer && <InfoItem label="Manufacturer" value={battery.manufacturer} />}
            {battery.model && <InfoItem label="Model" value={battery.model} />}
          </div>
        </div>
      )}
    </div>
  )
}