// src/main/collectors/cpu.collector.ts
import si from 'systeminformation'

export interface CPUMetric {
  usage: number
  usagePerCore: number[]
  temperature: number | null
  temperaturePerCore: number[]
  speed: number
}

export async function collectCPU(): Promise<CPUMetric> {
  const cpu = await si.currentLoad()
  const cpuTemp = await si.cpuTemperature()
  const cpuSpeed = await si.cpuCurrentSpeed()

  return {
    usage: Math.round(cpu.currentLoad * 100) / 100,
    usagePerCore: cpu.cpus.map((c) => Math.round(c.load * 100) / 100),
    temperature: cpuTemp.main > 0 ? cpuTemp.main : null,
    temperaturePerCore: (cpuTemp.cores ?? []).filter((c) => c > 0),
    speed: cpuSpeed.avg || 0
  }
}