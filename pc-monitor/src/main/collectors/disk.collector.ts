// src/main/collectors/disk.collector.ts
import si from 'systeminformation'

export interface DiskMetric {
  name: string
  type: string
  size: number
  used: number
  available: number
  usagePercent: number
  mount: string
  readSpeed: number  // IO ops/sec (delta)
  writeSpeed: number // IO ops/sec (delta)
}

// macOS APFS system-internal volumes that are not user-relevant
const EXCLUDED_MOUNTS = new Set([
  '/System/Volumes/VM',
  '/System/Volumes/Preboot',
  '/System/Volumes/Update',
  '/System/Volumes/xarts',
  '/System/Volumes/iSCPreboot',
  '/System/Volumes/Hardware',
  '/System/Volumes/Recovery',
])

// Module-level state for IO delta calculation
let lastRIO = 0
let lastWIO = 0
let lastDiskSampleTime = 0

// si.disksIO() can hang on Windows (WMI freeze). Race it against a 3-second fallback.
const FALLBACK_IO = { rIO: 0, wIO: 0, rIO_sec: null, wIO_sec: null, tIO: 0, ms: 0 }
function diskIOWithTimeout(): Promise<typeof FALLBACK_IO> {
  return Promise.race([
    si.disksIO() as Promise<typeof FALLBACK_IO>,
    new Promise<typeof FALLBACK_IO>((resolve) =>
      setTimeout(() => resolve(FALLBACK_IO), 3000)
    )
  ])
}

export async function collectDisk(): Promise<DiskMetric[]> {
  // Run both in parallel; a slow/hanging disksIO won't block fsSize
  const [fsSize, diskIO] = await Promise.all([
    si.fsSize(),
    diskIOWithTimeout().catch(() => FALLBACK_IO)
  ])

  // Compute IO delta since last sample
  const now = Date.now()
  const deltaSeconds = lastDiskSampleTime > 0 ? (now - lastDiskSampleTime) / 1000 : 1
  const rIO = diskIO.rIO ?? 0
  const wIO = diskIO.wIO ?? 0
  const readSpeed =
    lastDiskSampleTime > 0 && rIO >= lastRIO
      ? Math.round((rIO - lastRIO) / deltaSeconds)
      : 0
  const writeSpeed =
    lastDiskSampleTime > 0 && wIO >= lastWIO
      ? Math.round((wIO - lastWIO) / deltaSeconds)
      : 0
  lastRIO = rIO
  lastWIO = wIO
  lastDiskSampleTime = now

  return fsSize
    .filter((disk) => !EXCLUDED_MOUNTS.has(disk.mount) && disk.size > 0)
    .map((disk) => {
      // disk.use from si is already a percentage (0–100).
      // On some Windows configurations it may be NaN/null — compute manually as fallback.
      const rawUsePct = disk.use
      const usagePercent =
        typeof rawUsePct === 'number' && !isNaN(rawUsePct) && rawUsePct >= 0 && rawUsePct <= 100
          ? Math.round(rawUsePct * 100) / 100
          : disk.size > 0
            ? Math.round((disk.used / disk.size) * 10000) / 100
            : 0

      return {
        name: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usagePercent,
        mount: disk.mount,
        readSpeed,
        writeSpeed
      }
    })
}