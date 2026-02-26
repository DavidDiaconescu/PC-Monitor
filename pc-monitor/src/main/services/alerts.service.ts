// src/main/services/alerts.service.ts
import { Notification } from 'electron'
import { AlertsRepository } from '../database/repositories/alerts.repository'
import { SettingsRepository } from '../database/repositories/settings.repository'
import { Metric } from '../database/models/Metric'
import { Alert } from '../database/models/Alert'

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes per alert type

export class AlertsService {
  private readonly cooldowns = new Map<string, number>()

  constructor(
    private readonly alertsRepo: AlertsRepository,
    private readonly settingsRepo: SettingsRepository
  ) {}

  async checkAlerts(metric: Metric): Promise<void> {
    const settings = await this.settingsRepo.get()
    const { alerts } = settings

    if (alerts.cpu.enabled && metric.cpu.usage >= alerts.cpu.threshold) {
      await this.triggerAlert(
        'cpu',
        'High CPU Usage',
        `CPU usage is at ${metric.cpu.usage.toFixed(1)}% (threshold: ${alerts.cpu.threshold}%)`,
        'warning'
      )
    }

    if (alerts.ram.enabled && metric.ram.usagePercent >= alerts.ram.threshold) {
      await this.triggerAlert(
        'ram',
        'High RAM Usage',
        `RAM usage is at ${metric.ram.usagePercent.toFixed(1)}% (threshold: ${alerts.ram.threshold}%)`,
        'warning'
      )
    }

    if (
      alerts.cpuTemp.enabled &&
      metric.cpu.temperature !== null &&
      metric.cpu.temperature >= alerts.cpuTemp.threshold
    ) {
      await this.triggerAlert(
        'cpu_temp',
        'High CPU Temperature',
        `CPU temperature is ${metric.cpu.temperature}°C (threshold: ${alerts.cpuTemp.threshold}°C)`,
        'critical'
      )
    }

    if (
      alerts.gpuTemp.enabled &&
      metric.gpu?.temperature !== null &&
      metric.gpu?.temperature !== undefined
    ) {
      if (metric.gpu.temperature >= alerts.gpuTemp.threshold) {
        await this.triggerAlert(
          'gpu_temp',
          'High GPU Temperature',
          `GPU temperature is ${metric.gpu.temperature}°C (threshold: ${alerts.gpuTemp.threshold}°C)`,
          'critical'
        )
      }
    }

    if (alerts.disk.enabled) {
      for (const disk of metric.disk) {
        if (disk.usagePercent >= alerts.disk.threshold) {
          await this.triggerAlert(
            `disk_${disk.mount}`,
            'Disk Almost Full',
            `Disk "${disk.mount}" is at ${disk.usagePercent.toFixed(1)}% (threshold: ${alerts.disk.threshold}%)`,
            'warning'
          )
        }
      }
    }
  }

  private async triggerAlert(
    type: string,
    title: string,
    message: string,
    severity: Alert['severity'] = 'warning'
  ): Promise<void> {
    const now = Date.now()
    const lastFired = this.cooldowns.get(type) ?? 0

    if (now - lastFired < COOLDOWN_MS) {
      return
    }

    this.cooldowns.set(type, now)

    const alert: Alert = { timestamp: now, type, title, message, severity }
    await this.alertsRepo.save(alert)

    if (Notification.isSupported()) {
      new Notification({ title, body: message }).show()
    }
  }

  async getRecent(limit: number = 50): Promise<Alert[]> {
    return this.alertsRepo.findRecent(limit)
  }

  async clearAll(): Promise<void> {
    await this.alertsRepo.deleteAll()
  }
}
