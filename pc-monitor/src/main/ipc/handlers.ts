// src/main/ipc/handlers.ts
import { ipcMain, app, BrowserWindow } from 'electron'
import { IPC_EVENTS } from './events'
import { MetricsService } from '../services/metrics.service'
import { AlertsService } from '../services/alerts.service'
import { SettingsRepository } from '../database/repositories/settings.repository'
import { collectProcesses } from '../collectors'
import { collectNetwork } from '../collectors/network.collector'
import { runSpeedTest } from '../services/speedtest.service'
import type { SpeedTestProgress } from '../services/speedtest.service'
import { Settings } from '../database/models/Settings'
import logger from '../utils/logger'

export interface IPCDeps {
  metricsService: MetricsService
  alertsService?: AlertsService
  settingsRepo?: SettingsRepository
}

export function setupIPC(_window: BrowserWindow, deps: IPCDeps): void {
  const { metricsService, alertsService, settingsRepo } = deps

  ipcMain.handle(IPC_EVENTS.METRICS_GET_LATEST, async () => {
    try {
      return await metricsService.getLatest()
    } catch (err) {
      logger.error('IPC: metrics:getLatest failed', err)
      throw err
    }
  })

  ipcMain.handle(IPC_EVENTS.METRICS_GET_HISTORY, async (_event, range: string) => {
    try {
      return await metricsService.getHistory(range)
    } catch (err) {
      logger.error('IPC: metrics:getHistory failed', err)
      throw err
    }
  })

  ipcMain.handle(IPC_EVENTS.ALERTS_GET_RECENT, async (_event, limit: number = 50) => {
    if (!alertsService) return []
    try {
      return await alertsService.getRecent(limit)
    } catch (err) {
      logger.error('IPC: alerts:getRecent failed', err)
      return []
    }
  })

  ipcMain.handle(IPC_EVENTS.ALERTS_CLEAR, async () => {
    if (!alertsService) return
    try {
      await alertsService.clearAll()
    } catch (err) {
      logger.error('IPC: alerts:clearAll failed', err)
    }
  })

  ipcMain.handle(IPC_EVENTS.SETTINGS_GET, async () => {
    if (!settingsRepo) return null
    try {
      return await settingsRepo.get()
    } catch (err) {
      logger.error('IPC: settings:get failed', err)
      return null
    }
  })

  ipcMain.handle(IPC_EVENTS.SETTINGS_UPDATE, async (_event, settings: Settings) => {
    if (!settingsRepo) return
    try {
      await settingsRepo.update(settings)
    } catch (err) {
      logger.error('IPC: settings:update failed', err)
    }
  })

  ipcMain.handle(IPC_EVENTS.PROCESSES_GET, async () => {
    try {
      return await collectProcesses()
    } catch (err) {
      logger.error('IPC: processes:get failed', err)
      throw err
    }
  })

  ipcMain.handle(IPC_EVENTS.NETWORK_GET, async () => {
    try {
      return await collectNetwork()
    } catch (err) {
      logger.error('IPC: network:get failed', err)
      throw err
    }
  })

  ipcMain.handle(IPC_EVENTS.SPEEDTEST_RUN, async () => {
    try {
      await runSpeedTest((update: SpeedTestProgress) => {
        _window.webContents.send(IPC_EVENTS.SPEEDTEST_PROGRESS, update)
      })
    } catch (err) {
      logger.error('IPC: speedtest:run failed', err)
      throw err
    }
  })

  ipcMain.handle(IPC_EVENTS.APP_QUIT, () => {
    app.quit()
  })

  logger.info('IPC handlers registered')
}
