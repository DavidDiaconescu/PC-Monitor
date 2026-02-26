// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { Metric } from '../main/database/models/Metric'
import type { Alert } from '../main/database/models/Alert'
import type { Settings } from '../main/database/models/Settings'
import type { ProcessMetric } from '../main/collectors/processes.collector'
import type { NetworkStats } from '../main/collectors/network.collector'
import type { SpeedTestProgress } from '../main/services/speedtest.service'

// Event name constants — must stay in sync with src/main/ipc/events.ts
const EV = {
  METRICS_GET_LATEST: 'metrics:getLatest',
  METRICS_GET_HISTORY: 'metrics:getHistory',
  METRICS_REALTIME_UPDATE: 'metrics:realtimeUpdate',
  ALERTS_GET_RECENT: 'alerts:getRecent',
  ALERTS_CLEAR: 'alerts:clearAll',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  PROCESSES_GET: 'processes:get',
  NETWORK_GET: 'network:get',
  SPEEDTEST_RUN: 'speedtest:run',
  SPEEDTEST_PROGRESS: 'speedtest:progress',
  APP_QUIT: 'app:quit'
} as const

const electronAPI = {
  getLatestMetrics: (): Promise<Metric | null> => ipcRenderer.invoke(EV.METRICS_GET_LATEST),

  getMetricsHistory: (range: string): Promise<Metric[]> =>
    ipcRenderer.invoke(EV.METRICS_GET_HISTORY, range),

  getRecentAlerts: (limit: number = 50): Promise<Alert[]> =>
    ipcRenderer.invoke(EV.ALERTS_GET_RECENT, limit),

  clearAlerts: (): Promise<void> => ipcRenderer.invoke(EV.ALERTS_CLEAR),

  getSettings: (): Promise<Settings> => ipcRenderer.invoke(EV.SETTINGS_GET),

  updateSettings: (settings: Settings): Promise<void> =>
    ipcRenderer.invoke(EV.SETTINGS_UPDATE, settings),

  getProcesses: (): Promise<ProcessMetric[]> => ipcRenderer.invoke(EV.PROCESSES_GET),

  getNetwork: (): Promise<NetworkStats> => ipcRenderer.invoke(EV.NETWORK_GET),

  quitApp: (): Promise<void> => ipcRenderer.invoke(EV.APP_QUIT),

  runSpeedTest: (): Promise<void> => ipcRenderer.invoke(EV.SPEEDTEST_RUN),

  onSpeedTestProgress: (callback: (update: SpeedTestProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, update: SpeedTestProgress) => callback(update)
    ipcRenderer.on(EV.SPEEDTEST_PROGRESS, listener)
    return () => ipcRenderer.removeListener(EV.SPEEDTEST_PROGRESS, listener)
  },

  // Returns a cleanup function to remove the listener on unmount
  onMetricUpdate: (callback: (metric: Metric) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, metric: Metric) => callback(metric)
    ipcRenderer.on(EV.METRICS_REALTIME_UPDATE, listener)
    return () => ipcRenderer.removeListener(EV.METRICS_REALTIME_UPDATE, listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
}
