// src/main/services/scheduler.service.ts
import { MetricsService } from './metrics.service'
import { AlertsService } from './alerts.service'
import { AnalysisService } from './analysis.service'
import logger from '../utils/logger'

let intervalHandle: NodeJS.Timeout | null = null

export function startScheduler(
  metricsService: MetricsService,
  alertsService: AlertsService | undefined,
  analysisService: AnalysisService | undefined,
  intervalSeconds: number
): void {
  if (intervalHandle !== null) {
    logger.warn('Scheduler is already running. Call stopScheduler() first.')
    return
  }

  logger.info(`Scheduler started — collecting every ${intervalSeconds}s`)

  intervalHandle = setInterval(async () => {
    try {
      const metric = await metricsService.collectAndSave()

      if (alertsService) {
        await alertsService.checkAlerts(metric)
      }

      if (analysisService) {
        const insights = await analysisService.analyzeCurrentState(metric)
        if (insights.length > 0) {
          logger.debug('System insights', insights)
        }
      }
    } catch (err) {
      logger.error('Scheduler tick failed', err)
    }
  }, intervalSeconds * 1000)
}

export function stopScheduler(): void {
  if (intervalHandle === null) {
    logger.warn('Scheduler is not running.')
    return
  }

  clearInterval(intervalHandle)
  intervalHandle = null
  logger.info('Scheduler stopped.')
}