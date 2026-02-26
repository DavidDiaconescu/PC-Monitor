// src/preload/index.d.ts
import type { Metric } from '../main/database/models/Metric'
import type { Alert } from '../main/database/models/Alert'
import type { Settings } from '../main/database/models/Settings'
import type { ProcessMetric } from '../main/collectors/processes.collector'
import type { NetworkStats } from '../main/collectors/network.collector'
import type { SpeedTestProgress } from '../main/services/speedtest.service'

export interface ElectronAPI {
  getLatestMetrics: () => Promise<Metric | null>
  getMetricsHistory: (range: string) => Promise<Metric[]>
  getRecentAlerts: (limit?: number) => Promise<Alert[]>
  clearAlerts: () => Promise<void>
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Settings) => Promise<void>
  getProcesses: () => Promise<ProcessMetric[]>
  getNetwork: () => Promise<NetworkStats>
  quitApp: () => Promise<void>
  runSpeedTest: () => Promise<void>
  onSpeedTestProgress: (callback: (update: SpeedTestProgress) => void) => () => void
  onMetricUpdate: (callback: (metric: Metric) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}