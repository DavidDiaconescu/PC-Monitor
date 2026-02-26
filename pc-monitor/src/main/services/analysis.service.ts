// src/main/services/analysis.service.ts
import si from 'systeminformation'
import { MetricsRepository } from '../database/repositories/metrics.repository'
import { Metric } from '../database/models/Metric'

export interface SystemInsight {
  type: 'cpu' | 'ram' | 'gpu_temp' | 'cpu_temp' | 'battery' | 'disk'
  severity: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
}

export interface Trends {
  cpu: { avg: number; max: number }
  ram: { avg: number; max: number }
  sampleCount: number
}

export class AnalysisService {
  constructor(private readonly metricsRepo: MetricsRepository) {}

  async analyzeCurrentState(metric: Metric): Promise<SystemInsight[]> {
    const insights: SystemInsight[] = []

    // High CPU usage
    if (metric.cpu.usage > 90) {
      insights.push({
        type: 'cpu',
        severity: metric.cpu.usage > 95 ? 'critical' : 'warning',
        message: `CPU usage is critically high at ${metric.cpu.usage.toFixed(1)}%`,
        value: metric.cpu.usage,
        threshold: 90
      })
    }

    // High RAM usage
    if (metric.ram.usagePercent > 85) {
      insights.push({
        type: 'ram',
        severity: metric.ram.usagePercent > 95 ? 'critical' : 'warning',
        message: `RAM usage is high at ${metric.ram.usagePercent.toFixed(1)}%`,
        value: metric.ram.usagePercent,
        threshold: 85
      })
    }

    // High GPU temperature
    if (
      metric.gpu?.temperature !== null &&
      metric.gpu?.temperature !== undefined &&
      metric.gpu.temperature > 80
    ) {
      insights.push({
        type: 'gpu_temp',
        severity: metric.gpu.temperature > 90 ? 'critical' : 'warning',
        message: `GPU temperature is high at ${metric.gpu.temperature}°C`,
        value: metric.gpu.temperature,
        threshold: 80
      })
    }

    // High CPU temperature
    if (metric.cpu.temperature !== null && metric.cpu.temperature > 85) {
      insights.push({
        type: 'cpu_temp',
        severity: metric.cpu.temperature > 95 ? 'critical' : 'warning',
        message: `CPU temperature is high at ${metric.cpu.temperature}°C`,
        value: metric.cpu.temperature,
        threshold: 85
      })
    }

    // Low battery
    try {
      const battery = await si.battery()
      if (battery.hasBattery && battery.percent < 15 && !battery.isCharging) {
        insights.push({
          type: 'battery',
          severity: battery.percent < 5 ? 'critical' : 'warning',
          message: `Battery is low at ${battery.percent}%`,
          value: battery.percent,
          threshold: 15
        })
      }
    } catch {
      // Battery info not available on this platform
    }

    // Disk almost full
    for (const disk of metric.disk) {
      if (disk.usagePercent > 90) {
        insights.push({
          type: 'disk',
          severity: disk.usagePercent > 95 ? 'critical' : 'warning',
          message: `Disk "${disk.mount}" is almost full at ${disk.usagePercent.toFixed(1)}%`,
          value: disk.usagePercent,
          threshold: 90
        })
      }
    }

    return insights
  }

  async getTrends(hours: number): Promise<Trends> {
    const metrics = await this.metricsRepo.findRecent(hours)

    if (metrics.length === 0) {
      return { cpu: { avg: 0, max: 0 }, ram: { avg: 0, max: 0 }, sampleCount: 0 }
    }

    let cpuSum = 0,
      cpuMax = 0
    let ramSum = 0,
      ramMax = 0

    for (const m of metrics) {
      cpuSum += m.cpu.usage
      cpuMax = Math.max(cpuMax, m.cpu.usage)
      ramSum += m.ram.usagePercent
      ramMax = Math.max(ramMax, m.ram.usagePercent)
    }

    const count = metrics.length
    return {
      cpu: {
        avg: Math.round((cpuSum / count) * 100) / 100,
        max: Math.round(cpuMax * 100) / 100
      },
      ram: {
        avg: Math.round((ramSum / count) * 100) / 100,
        max: Math.round(ramMax * 100) / 100
      },
      sampleCount: count
    }
  }
}
