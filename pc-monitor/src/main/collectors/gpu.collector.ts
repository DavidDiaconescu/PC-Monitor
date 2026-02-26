// src/main/collectors/gpu.collector.ts
import si from 'systeminformation'
import { execSync } from 'child_process'

export interface GPUMetric {
  name: string
  vendor: string
  usage: number | null       // null = not available
  memoryUsed: number | null  // MB
  memoryTotal: number | null // MB
  temperature: number | null
  fanSpeed: number | null
  powerDraw: number | null
  cores: number | null
  isIntegrated: boolean
  vramDynamic: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validPercent(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v <= 100
}
function validTemp(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 200
}
function validPower(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 2000
}
function validMB(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 200_000
}

// ─── NVIDIA-smi (Windows / Linux) ────────────────────────────────────────────
// nvidia-smi ships with every NVIDIA driver and provides accurate, real-time data.
// CSV output: name, gpu%, mem%, temp°C, fan%, powerW, memUsedMB, memTotalMB

function tryNvidiaSmi(): GPUMetric[] {
  try {
    const raw = execSync(
      'nvidia-smi --query-gpu=name,utilization.gpu,utilization.memory,temperature.gpu,fan.speed,power.draw,memory.used,memory.total --format=csv,noheader,nounits',
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    )
    const gpus: GPUMetric[] = []
    for (const line of raw.trim().split('\n')) {
      const parts = line.split(',').map((s) => s.trim())
      if (parts.length < 8) continue
      const [name, gpuPct, , tempStr, fanStr, powerStr, memUsedStr, memTotalStr] = parts
      const usage   = parseFloat(gpuPct)
      const temp    = parseFloat(tempStr)
      const fan     = parseFloat(fanStr)
      const power   = parseFloat(powerStr)
      const memUsed = parseFloat(memUsedStr)
      const memTotal = parseFloat(memTotalStr)
      gpus.push({
        name: name || 'NVIDIA GPU',
        vendor: 'NVIDIA',
        usage:        validPercent(usage)   ? usage   : null,
        temperature:  validTemp(temp)       ? temp    : null,
        fanSpeed:     validPercent(fan)     ? fan     : null,
        powerDraw:    validPower(power)     ? power   : null,
        memoryUsed:   validMB(memUsed)      ? memUsed   : null,
        memoryTotal:  validMB(memTotal)     ? memTotal  : null,
        cores: null,       // nvidia-smi doesn't expose CUDA core count easily
        isIntegrated: false,
        vramDynamic: false
      })
    }
    return gpus
  } catch {
    return []
  }
}

// ─── Systeminformation fallback ───────────────────────────────────────────────

function fromSiGraphics(): Promise<GPUMetric[]> {
  return si.graphics().then((graphics) => {
    if (!graphics.controllers || graphics.controllers.length === 0) return []

    return graphics.controllers.map((gpu) => {
      // Apple Silicon: bus is 'Built-In', vramDynamic true
      // Integrated Intel/AMD on Windows: bus is empty or 'PCI', vram is 0
      const isIntegrated =
        gpu.bus === 'Built-In' ||
        (gpu.vramDynamic === true && !gpu.vram) ||
        (gpu.bus === '' && !gpu.vram)

      const rawUsage = gpu.utilizationGpu
      const rawTemp  = gpu.temperatureGpu
      const rawFan   = gpu.fanSpeed
      const rawPower = gpu.powerDraw

      // Windows WMI returns -1 for unsupported fields; guard all values
      const usage      = validPercent(rawUsage) && !isIntegrated ? rawUsage : null
      const temp       = validTemp(rawTemp)   ? rawTemp   : null
      const fanSpeed   = validPercent(rawFan) ? rawFan    : null
      const powerDraw  = validPower(rawPower) ? rawPower  : null

      const memoryTotal = validMB(gpu.memoryTotal) ? gpu.memoryTotal : null
      const memoryUsed  = validMB(gpu.memoryUsed)  ? gpu.memoryUsed  : null

      const coresRaw = gpu.cores
      const cores =
        coresRaw !== null && coresRaw !== undefined
          ? parseInt(String(coresRaw)) || null
          : null

      return {
        name: gpu.model || 'Unknown GPU',
        vendor: gpu.vendor || '',
        usage,
        memoryUsed,
        memoryTotal,
        temperature: temp,
        fanSpeed,
        powerDraw,
        cores,
        isIntegrated,
        vramDynamic: gpu.vramDynamic === true
      }
    })
  })
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function collectGPU(): Promise<GPUMetric[]> {
  // On Windows/Linux, try nvidia-smi first — it gives much more accurate data
  // than WMI for NVIDIA cards.
  if (process.platform !== 'darwin') {
    const nvidiaGpus = tryNvidiaSmi()
    if (nvidiaGpus.length > 0) {
      // Also get SI data for any non-NVIDIA GPUs in the same system
      const siGpus = await fromSiGraphics().catch(() => [])
      // Add SI-sourced GPUs that are NOT NVIDIA (already covered above)
      const nonNvidia = siGpus.filter(
        (g) => !g.vendor.toUpperCase().includes('NVIDIA')
      )
      return [...nvidiaGpus, ...nonNvidia]
    }
  }

  // macOS or nvidia-smi not found: use systeminformation
  return fromSiGraphics()
}