// src/main/index.ts
import { app, BrowserWindow, globalShortcut } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './database'
import { MetricsRepository } from './database/repositories/metrics.repository'
import { AlertsRepository } from './database/repositories/alerts.repository'
import { SettingsRepository } from './database/repositories/settings.repository'
import { MetricsService } from './services/metrics.service'
import { AlertsService } from './services/alerts.service'
import { AnalysisService } from './services/analysis.service'
import { startScheduler, stopScheduler } from './services/scheduler.service'
import { createWindow, showWindow, toggleWindow } from './window'
import { createTray, updateTrayStats } from './tray'
import { setupIPC } from './ipc/handlers'
import { IPC_EVENTS } from './ipc/events'
import logger from './utils/logger'

app.whenReady().then(async () => {
  // 1. Initialize database — wrapped in try/catch so a native module failure
  //    (e.g. missing VC++ runtime on Windows) never prevents the UI from loading
  let metricsRepo: MetricsRepository | null = null
  let alertsRepo: AlertsRepository | null = null
  let settingsRepo: SettingsRepository | null = null
  let dbOk = false

  try {
    await initDatabase()
    metricsRepo = new MetricsRepository()
    alertsRepo = new AlertsRepository()
    settingsRepo = new SettingsRepository()
    dbOk = true
    logger.info('Database initialized')
  } catch (err) {
    logger.error('Database initialization failed — running in memory-only mode', err)
    // App continues without persistence; real-time metrics still work
  }

  // 2. Create services (MetricsService accepts null repo and falls back to in-memory)
  const metricsService = new MetricsService(metricsRepo)
  const alertsService = alertsRepo && settingsRepo
    ? new AlertsService(alertsRepo, settingsRepo)
    : null
  const analysisService = metricsRepo ? new AnalysisService(metricsRepo) : null

  electronApp.setAppUserModelId('com.pcmonitor.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 3. Create main window — always happens regardless of DB status
  const mainWindow = createWindow()

  // 4. Create system tray
  createTray()

  // 5. Setup IPC handlers
  setupIPC(mainWindow, {
    metricsService,
    alertsService: alertsService ?? undefined,
    settingsRepo: settingsRepo ?? undefined
  })

  // 6. Start scheduler with settings from DB (or default 2s interval)
  // NOTE: pollingInterval is in SECONDS — the scheduler multiplies by 1000 internally
  let pollingInterval = 2
  if (dbOk && settingsRepo) {
    try {
      const settings = await settingsRepo.get()
      pollingInterval = settings.pollingInterval
    } catch {
      logger.warn('Could not read settings, using default polling interval')
    }
  }
  startScheduler(metricsService, alertsService ?? undefined, analysisService ?? undefined, pollingInterval)

  // Trigger an immediate first collection so the UI has data right away
  // (setInterval doesn't fire until after the first delay)
  metricsService.collectAndSave().catch((err) => logger.error('Initial collection failed', err))

  // 7. Broadcast real-time metric updates to renderer every 2 seconds
  setInterval(async () => {
    try {
      const metric = await metricsService.getLatest()
      if (metric && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_EVENTS.METRICS_REALTIME_UPDATE, metric)
        updateTrayStats(metric)
      }
    } catch (err) {
      logger.error('Failed to broadcast metric update', err)
    }
  }, 2000)

  // 8. Global keyboard shortcut
  const shortcut = process.platform === 'darwin' ? 'Command+Shift+M' : 'Ctrl+Shift+M'
  const registered = globalShortcut.register(shortcut, () => toggleWindow())
  if (registered) {
    logger.info(`Global shortcut registered: ${shortcut}`)
  } else {
    logger.warn(`Failed to register global shortcut: ${shortcut}`)
  }

  logger.info(`App ready (database: ${dbOk ? 'ok' : 'unavailable — memory-only mode'})`)
})

app.on('activate', () => {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) showWindow()
})

app.on('before-quit', async () => {
  globalShortcut.unregisterAll()
  stopScheduler()
  try { await closeDatabase() } catch { /* ignore */ }
  logger.info('App shutting down')
})

// Keep app alive in tray when window is closed
app.on('window-all-closed', () => {
  // intentionally empty — app lives in system tray
})