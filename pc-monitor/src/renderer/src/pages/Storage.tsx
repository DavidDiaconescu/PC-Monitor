// src/renderer/src/pages/Storage.tsx
import { HardDrive, Info } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { useMetrics } from '../hooks/useMetrics'
import { formatBytes, getUsageColor, getUsageBgColor } from '../utils/formatters'

export default function Storage() {
  const { metric, loading } = useMetrics()

  if (loading && !metric) return <LoadingSpinner />
  if (!metric) return <p className="text-slate-400 text-sm">No data yet…</p>

  const disks = metric.disk

  // Detect APFS (macOS) — multiple volumes sharing same backing device
  const hasApfs = disks.some((d) => d.type === 'APFS')

  // For APFS, the "available" field is the same shared pool across all volumes.
  const rootVolume = disks.find((d) => d.mount === '/')

  // For overall summary: total used = sum of per-volume 'used'
  // For overall available: use the shared pool (same for all APFS volumes)
  const sharedAvailable = hasApfs && rootVolume ? rootVolume.available : null
  const totalUsed = disks.reduce((s, d) => s + d.used, 0)
  const totalPhysical = sharedAvailable !== null ? totalUsed + sharedAvailable : null

  // IO (global, applies to all volumes on same physical device)
  const ioSample = disks[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HardDrive className="w-6 h-6 text-green-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Storage</h1>
          <p className="text-sm text-slate-500">Disk capacity, utilization and I/O activity</p>
        </div>
      </div>

      {/* APFS info note */}
      {hasApfs && (
        <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-slate-300 mb-1">macOS APFS — Shared Storage Pool</p>
            <p className="text-xs text-slate-400">
              APFS (Apple File System) uses a flexible container model — all volumes share one common
              pool of free space rather than having fixed partitions. The{' '}
              <strong className="text-slate-300">Available</strong> figure is the same shared pool
              accessible by every volume. Usage % = <code className="bg-slate-700 px-1 rounded">used ÷ (used + available)</code>.
            </p>
          </div>
        </div>
      )}

      {/* Overall summary */}
      {totalPhysical !== null && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-xs font-semibold text-slate-300">Total Physical Disk</p>
              <p className="text-[11px] text-slate-500 mb-3">Combined capacity of all storage volumes</p>
              <p className="text-3xl font-bold font-mono text-slate-100">
                {formatBytes(totalPhysical)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-mono">{formatBytes(totalUsed)} used</p>
              <p className="text-sm text-green-400 font-mono">{formatBytes(sharedAvailable!)} free</p>
            </div>
          </div>
          {totalPhysical > 0 && (
            <div className="w-full bg-slate-700/80 rounded-full h-2.5 mt-4">
              <div
                className={`h-2.5 rounded-full transition-all ${getUsageBgColor((totalUsed / totalPhysical) * 100)}`}
                style={{ width: `${Math.min((totalUsed / totalPhysical) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* IO stats */}
      {ioSample && (ioSample.readSpeed > 0 || ioSample.writeSpeed > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300">Read I/O</p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Disk read operations completed per second</p>
            <p className="text-xl font-bold text-blue-400 font-mono">
              {ioSample.readSpeed.toLocaleString()} ops/s
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300">Write I/O</p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Disk write operations completed per second</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">
              {ioSample.writeSpeed.toLocaleString()} ops/s
            </p>
          </div>
        </div>
      )}

      {/* Per-volume list */}
      <div className="space-y-3">
        {disks.map((disk, i) => {
          // macOS: / or /System/Volumes/Data; Windows: C:\, D:\, etc.
          const isMain = disk.mount === '/' ||
            disk.mount === '/System/Volumes/Data' ||
            /^[A-Za-z]:[/\\]?$/.test(disk.mount)
          return (
            <div
              key={i}
              className={`bg-slate-800 border border-slate-700/50 rounded-xl p-5 ${!isMain ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {disk.mount === '/' ? '/ — System Volume' :
                     disk.mount === '/System/Volumes/Data' ? '/Data — User Data' :
                     disk.mount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{disk.name} · {disk.type}</p>
                </div>
                <span className={`text-lg font-bold font-mono ${getUsageColor(disk.usagePercent)}`}>
                  {disk.usagePercent.toFixed(1)}%
                </span>
              </div>

              <div className="w-full bg-slate-700/80 rounded-full h-2 my-3">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageBgColor(disk.usagePercent)}`}
                  style={{ width: `${Math.min(disk.usagePercent, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5 font-medium">Used</p>
                  <p className="text-[11px] text-slate-600 mb-1">Space occupied by files</p>
                  <p className="font-mono font-semibold text-slate-300">{formatBytes(disk.used)}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5 font-medium">Available</p>
                  <p className="text-[11px] text-slate-600 mb-1">{hasApfs ? 'Free in shared APFS pool' : 'Free space remaining'}</p>
                  <p className="font-mono font-semibold text-slate-300">{formatBytes(disk.available)}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5 font-medium">Container Size</p>
                  <p className="text-[11px] text-slate-600 mb-1">Total raw capacity reported</p>
                  <p className="font-mono font-semibold text-slate-300">{formatBytes(disk.size)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}