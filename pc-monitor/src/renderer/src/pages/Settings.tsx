// src/renderer/src/pages/Settings.tsx
import { useState, useEffect } from 'react'
import { Save, RotateCcw, Check } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSettings } from '../hooks/useSettings'
import { Settings as SettingsType } from '../types'
import clsx from 'clsx'

const DEFAULT_SETTINGS: SettingsType = {
  pollingInterval: 10,
  dataRetention: 7,
  alerts: {
    cpu: { enabled: true, threshold: 90 },
    ram: { enabled: true, threshold: 85 },
    gpuTemp: { enabled: true, threshold: 80 },
    cpuTemp: { enabled: true, threshold: 85 },
    disk: { enabled: true, threshold: 90 }
  },
  theme: 'dark',
  startOnBoot: false
}

interface ThresholdRowProps {
  label: string
  unit: string
  max: number
  enabled: boolean
  threshold: number
  onToggle: (v: boolean) => void
  onChange: (v: number) => void
}

function ThresholdRow({ label, unit, max, enabled, threshold, onToggle, onChange }: ThresholdRowProps) {
  const pct = (threshold / max) * 100
  const color = pct >= 85 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-green-400'
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-700/50 last:border-0">
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
      </label>
      <span className="text-sm text-slate-300 w-36 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={1}
        max={max}
        value={threshold}
        disabled={!enabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500 disabled:opacity-40"
      />
      <span className={clsx('text-sm font-semibold w-16 text-right flex-shrink-0', enabled ? color : 'text-slate-600')}>
        {threshold}{unit}
      </span>
    </div>
  )
}

export default function Settings() {
  const { settings, loading, saveSettings } = useSettings()
  const [form, setForm] = useState<SettingsType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  if (loading || !form) return <LoadingSpinner />

  const update = (partial: Partial<SettingsType>) => {
    setForm((prev) => prev ? { ...prev, ...partial } : prev)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    await saveSettings(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS)
    setConfirmReset(false)
    setSaved(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      {/* ── Monitoring ── */}
      <Section title="Monitoring">
        <div className="space-y-5">
          <SliderField
            label="Polling Interval"
            description={`Collecting metrics every ${form.pollingInterval} seconds`}
            min={5}
            max={60}
            value={form.pollingInterval}
            unit="s"
            onChange={(v) => update({ pollingInterval: v })}
          />
          <SliderField
            label="Data Retention"
            description={`Keeping data for ${form.dataRetention} days`}
            min={7}
            max={90}
            value={form.dataRetention}
            unit=" days"
            onChange={(v) => update({ dataRetention: v })}
          />
        </div>
      </Section>

      {/* ── Alert Thresholds ── */}
      <Section title="Alert Thresholds">
        <ThresholdRow
          label="CPU Usage"
          unit="%"
          max={100}
          enabled={form.alerts.cpu.enabled}
          threshold={form.alerts.cpu.threshold}
          onToggle={(v) => update({ alerts: { ...form.alerts, cpu: { ...form.alerts.cpu, enabled: v } } })}
          onChange={(v) => update({ alerts: { ...form.alerts, cpu: { ...form.alerts.cpu, threshold: v } } })}
        />
        <ThresholdRow
          label="RAM Usage"
          unit="%"
          max={100}
          enabled={form.alerts.ram.enabled}
          threshold={form.alerts.ram.threshold}
          onToggle={(v) => update({ alerts: { ...form.alerts, ram: { ...form.alerts.ram, enabled: v } } })}
          onChange={(v) => update({ alerts: { ...form.alerts, ram: { ...form.alerts.ram, threshold: v } } })}
        />
        <ThresholdRow
          label="CPU Temperature"
          unit="°C"
          max={120}
          enabled={form.alerts.cpuTemp.enabled}
          threshold={form.alerts.cpuTemp.threshold}
          onToggle={(v) => update({ alerts: { ...form.alerts, cpuTemp: { ...form.alerts.cpuTemp, enabled: v } } })}
          onChange={(v) => update({ alerts: { ...form.alerts, cpuTemp: { ...form.alerts.cpuTemp, threshold: v } } })}
        />
        <ThresholdRow
          label="GPU Temperature"
          unit="°C"
          max={120}
          enabled={form.alerts.gpuTemp.enabled}
          threshold={form.alerts.gpuTemp.threshold}
          onToggle={(v) => update({ alerts: { ...form.alerts, gpuTemp: { ...form.alerts.gpuTemp, enabled: v } } })}
          onChange={(v) => update({ alerts: { ...form.alerts, gpuTemp: { ...form.alerts.gpuTemp, threshold: v } } })}
        />
        <ThresholdRow
          label="Disk Usage"
          unit="%"
          max={100}
          enabled={form.alerts.disk.enabled}
          threshold={form.alerts.disk.threshold}
          onToggle={(v) => update({ alerts: { ...form.alerts, disk: { ...form.alerts.disk, enabled: v } } })}
          onChange={(v) => update({ alerts: { ...form.alerts, disk: { ...form.alerts.disk, threshold: v } } })}
        />
      </Section>

      {/* ── System ── */}
      <Section title="System">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.startOnBoot}
            onChange={(e) => update({ startOnBoot: e.target.checked })}
            className="accent-blue-500 w-4 h-4"
          />
          <div>
            <p className="text-sm text-slate-200">Start on boot</p>
            <p className="text-xs text-slate-500">Launch PC Monitor when your computer starts</p>
          </div>
        </label>
        <p className="text-xs text-slate-600 mt-4">
          Window close → minimizes to system tray. Use the tray icon to quit.
        </p>
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>

        {confirmReset ? (
          <>
            <span className="text-sm text-slate-400">Reset all settings?</span>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

function SliderField({
  label,
  description,
  min,
  max,
  value,
  unit,
  onChange
}: {
  label: string
  description: string
  min: number
  max: number
  value: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-200">{label}</label>
        <span className="text-sm font-semibold text-blue-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  )
}