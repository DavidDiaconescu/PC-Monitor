// src/main/database/models/Settings.ts
export interface Settings {
  pollingInterval: number // seconds
  dataRetention: number // days
  alerts: {
    cpu: { enabled: boolean; threshold: number }
    ram: { enabled: boolean; threshold: number }
    gpuTemp: { enabled: boolean; threshold: number }
    cpuTemp: { enabled: boolean; threshold: number }
    disk: { enabled: boolean; threshold: number }
  }
  theme: 'light' | 'dark'
  startOnBoot: boolean
}

export const defaultSettings: Settings = {
  pollingInterval: 2,
  dataRetention: 7,
  alerts: {
    cpu: { enabled: true, threshold: 90 },
    ram: { enabled: true, threshold: 85 },
    gpuTemp: { enabled: true, threshold: 80 },
    cpuTemp: { enabled: true, threshold: 85 },
    disk: { enabled: true, threshold: 90 }
  },
  theme: 'dark',
  startOnBoot: false
}
