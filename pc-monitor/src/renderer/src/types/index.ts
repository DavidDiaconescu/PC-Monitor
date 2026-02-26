// src/renderer/src/types/index.ts

export interface CPUMetric {
  usage: number
  usagePerCore: number[]
  temperature: number | null
  temperaturePerCore: number[]
  speed: number
}

export interface RAMMetric {
  total: number
  used: number
  free: number
  available: number
  usagePercent: number
  swapTotal: number
  swapUsed: number
  swapFree: number
}

export interface GPUMetric {
  name: string
  vendor: string
  usage: number | null       // null on Apple Silicon / when not available
  memoryUsed: number | null  // MB
  memoryTotal: number | null // MB
  temperature: number | null
  fanSpeed: number | null
  powerDraw: number | null
  cores: number | null
  isIntegrated: boolean
  vramDynamic: boolean
}

export interface DiskMetric {
  name: string
  type: string
  size: number
  used: number
  available: number
  usagePercent: number
  mount: string
  readSpeed: number
  writeSpeed: number
}

export interface TemperatureMetric {
  cpu: number | null
  gpu: number | null
  motherboard: number | null
  cores: number[]
  nvme: number | null
  available: boolean
}

export interface BatteryMetric {
  percent: number
  isCharging: boolean
  acConnected: boolean
  hasBattery: boolean
  timeRemaining: number | null
  health: number | null
  cycleCount: number | null
  voltage: number | null
  designedCapacity: number | null
  maxCapacity: number | null
  currentCapacity: number | null
  capacityUnit: string
  type: string
  model: string
  manufacturer: string
}

export interface NetworkMetric {
  interface: string
  downloadSpeed: number
  uploadSpeed: number
  downloadTotal: number
  uploadTotal: number
}

export interface NetworkStats {
  interfaces: NetworkMetric[]
  ping: number | null
}

export interface Metric {
  id?: number
  timestamp: number
  cpu: CPUMetric
  ram: RAMMetric
  gpu: GPUMetric | null
  disk: DiskMetric[]
  temperature?: TemperatureMetric
  battery?: BatteryMetric | null
}

export interface Alert {
  id?: number
  timestamp: number
  type: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface AlertThreshold {
  enabled: boolean
  threshold: number
}

export interface Settings {
  pollingInterval: number
  dataRetention: number
  alerts: {
    cpu: AlertThreshold
    ram: AlertThreshold
    gpuTemp: AlertThreshold
    cpuTemp: AlertThreshold
    disk: AlertThreshold
  }
  theme: 'light' | 'dark'
  startOnBoot: boolean
}

export interface ProcessMetric {
  pid: number
  name: string
  cpu: number
  mem: number
  memVsz: number
  memRss: number
  started: string
  state: string
  user: string
  command: string
}