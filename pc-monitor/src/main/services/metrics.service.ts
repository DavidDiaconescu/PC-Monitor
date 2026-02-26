// src/main/services/metrics.service.ts
import {
  collectCPU,
  collectRAM,
  collectGPU,
  collectDisk,
  collectTemperature,
  collectBattery
} from '../collectors'
import type { CPUMetric } from '../collectors/cpu.collector'
import type { RAMMetric } from '../collectors/ram.collector'
import type { GPUMetric } from '../collectors/gpu.collector'
import type { DiskMetric } from '../collectors/disk.collector'
import type { TemperatureMetric } from '../collectors/temperature.collector'
import { MetricsRepository } from '../database/repositories/metrics.repository'
import { Metric } from '../database/models/Metric'
import logger from '../utils/logger'

const FALLBACK_CPU: CPUMetric = { usage: 0, usagePerCore: [], temperature: null, temperaturePerCore: [], speed: 0 }
const FALLBACK_RAM: RAMMetric = { total: 0, used: 0, free: 0, available: 0, usagePercent: 0, swapTotal: 0, swapUsed: 0, swapFree: 0 }
const FALLBACK_GPU: GPUMetric[] = []
const FALLBACK_DISK: DiskMetric[] = []
const FALLBACK_TEMP: TemperatureMetric = { cpu: null, gpu: null, motherboard: null, cores: [], nvme: null, available: false }

const TIME_RANGES: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30
}

export class MetricsService {
  // In-memory fallback: always keep the last metric so real-time display
  // works even if the database is unavailable (e.g. native module failed on Windows)
  private lastMetric: Metric | null = null
  private dbAvailable = true

  constructor(private readonly metricsRepo: MetricsRepository | null) {
    this.dbAvailable = metricsRepo !== null
  }

  async collectAndSave(): Promise<Metric> {
    // Each collector is individually guarded — one failure won't kill the entire collection
    const [cpu, ram, gpuList, disk, temperature, battery] = await Promise.all([
      collectCPU().catch((err) => { logger.warn('CPU collector failed', err); return FALLBACK_CPU }),
      collectRAM().catch((err) => { logger.warn('RAM collector failed', err); return FALLBACK_RAM }),
      collectGPU().catch((err) => { logger.warn('GPU collector failed', err); return FALLBACK_GPU }),
      collectDisk().catch((err) => { logger.warn('Disk collector failed', err); return FALLBACK_DISK }),
      collectTemperature().catch((err) => { logger.warn('Temperature collector failed', err); return FALLBACK_TEMP }),
      collectBattery().catch((err) => { logger.warn('Battery collector failed', err); return null })
    ])

    const metric: Metric = {
      timestamp: Date.now(),
      cpu,
      ram,
      gpu: gpuList.length > 0 ? gpuList[0] : null,
      disk,
      temperature,
      battery
    }

    // Always cache in memory so getLatest() never fails
    this.lastMetric = metric

    if (this.dbAvailable && this.metricsRepo) {
      try {
        await this.metricsRepo.save(metric)
      } catch (err) {
        logger.warn('Failed to persist metric to database (in-memory fallback active)', err)
        this.dbAvailable = false
      }
    }

    return metric
  }

  async getLatest(): Promise<Metric | null> {
    // Return in-memory metric immediately — this is always up to date
    // and avoids a DB round-trip on every 2-second broadcast
    if (this.lastMetric) return this.lastMetric

    if (!this.dbAvailable || !this.metricsRepo) return null

    try {
      return await this.metricsRepo.findLatest()
    } catch (err) {
      logger.warn('Failed to read latest metric from database', err)
      return null
    }
  }

  async getHistory(timeRange: string): Promise<Metric[]> {
    if (!this.dbAvailable || !this.metricsRepo) return []
    const hours = TIME_RANGES[timeRange]
    if (hours === undefined) {
      throw new Error(
        `Unknown time range: "${timeRange}". Valid values: ${Object.keys(TIME_RANGES).join(', ')}`
      )
    }
    try {
      return await this.metricsRepo.findRecent(hours)
    } catch (err) {
      logger.warn('Failed to read history from database', err)
      return []
    }
  }

  async cleanup(retentionDays: number): Promise<void> {
    if (!this.dbAvailable || !this.metricsRepo) return
    try {
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
      await this.metricsRepo.deleteOlderThan(cutoff)
    } catch (err) {
      logger.warn('Failed to cleanup old metrics', err)
    }
  }
}