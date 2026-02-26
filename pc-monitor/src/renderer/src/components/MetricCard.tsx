// src/renderer/src/components/MetricCard.tsx
import { ReactNode } from 'react'
import { getUsageColor, getUsageBgColor, clampPercent } from '../utils/formatters'

interface Props {
  title: string
  description?: string
  value: number | null
  unit: string
  icon: ReactNode
  max?: number
  subtitle?: string
}

function statusBadge(percent: number) {
  if (percent >= 85) return { label: 'Critical', cls: 'bg-red-500/20 text-red-400' }
  if (percent >= 70) return { label: 'High', cls: 'bg-orange-500/20 text-orange-400' }
  if (percent >= 50) return { label: 'Moderate', cls: 'bg-yellow-500/20 text-yellow-400' }
  return { label: 'Normal', cls: 'bg-green-500/20 text-green-400' }
}

export default function MetricCard({ title, description, value, unit, icon, max, subtitle }: Props) {
  const percent = value !== null && max ? clampPercent((value / max) * 100) : (value ?? 0)
  const displayValue = value !== null ? value.toFixed(1) : '—'
  const colorClass = value !== null ? getUsageColor(percent) : 'text-slate-500'
  const badge = value !== null ? statusBadge(percent) : null

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:bg-slate-750 hover:border-slate-600/60">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 leading-tight">{title}</p>
            {description && (
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className={`text-3xl font-bold font-mono ${colorClass}`}>
        {displayValue}
        <span className="text-lg font-normal text-slate-400 ml-1">{unit}</span>
      </div>

      {subtitle && <p className="text-xs text-slate-500 -mt-1 truncate">{subtitle}</p>}

      {value !== null && (
        <div className="w-full bg-slate-700/80 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${getUsageBgColor(percent)}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}