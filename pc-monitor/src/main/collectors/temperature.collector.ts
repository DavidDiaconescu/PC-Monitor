// src/main/collectors/temperature.collector.ts
import si from 'systeminformation'
import { execSync } from 'child_process'

export interface TemperatureMetric {
  cpu: number | null
  gpu: number | null
  motherboard: number | null
  cores: number[]
  nvme: number | null        // NVMe SSD temperature (accessible on macOS)
  available: boolean         // false = sensors blocked (Apple Silicon without sudo)
}

// Try to read NVMe temperature via SMART data — macOS only
function readNvmeTemp(): number | null {
  // smartctl and /dev/disk0 are macOS-specific; skip entirely on other platforms
  if (process.platform !== 'darwin') return null

  try {
    // smartctl works on macOS if installed (brew install smartmontools)
    const out = execSync(
      'smartctl -A /dev/disk0 2>/dev/null | grep -i "Temperature_Celsius\\|Airflow_Temperature"',
      { encoding: 'utf8', timeout: 2000 }
    )
    const match = out.match(/(\d+)\s*(?:\(.*\))?\s*$/m)
    if (match) {
      const temp = parseInt(match[1])
      return temp > 0 && temp < 150 ? temp : null
    }
  } catch {
    // smartctl not installed or no permission
  }

  return null
}

export async function collectTemperature(): Promise<TemperatureMetric> {
  const [cpuTemp, graphics, diskLayouts] = await Promise.all([
    si.cpuTemperature(),
    si.graphics(),
    si.diskLayout()
  ])

  const rawGpuTemp =
    graphics.controllers.length > 0 ? graphics.controllers[0].temperatureGpu : null
  const rawMotherboard =
    cpuTemp.socket && cpuTemp.socket.length > 0 ? cpuTemp.socket[0] : null

  const cpu = cpuTemp.main > 0 ? cpuTemp.main : null
  const gpu = typeof rawGpuTemp === 'number' && rawGpuTemp > 0 ? rawGpuTemp : null
  const motherboard =
    typeof rawMotherboard === 'number' && rawMotherboard > 0 ? rawMotherboard : null
  const cores = (cpuTemp.cores ?? []).filter((c) => c > 0)

  // NVMe temp: try SMART data from diskLayout first
  let nvme: number | null = null
  for (const disk of diskLayouts) {
    if (typeof disk.temperature === 'number' && disk.temperature > 0) {
      nvme = disk.temperature
      break
    }
  }
  // If diskLayout didn't have it, try smartctl
  if (nvme === null) {
    nvme = readNvmeTemp()
  }

  const available = cpu !== null || gpu !== null || motherboard !== null || cores.length > 0

  return { cpu, gpu, motherboard, cores, nvme, available }
}