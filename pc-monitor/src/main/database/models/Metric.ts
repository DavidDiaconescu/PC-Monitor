// src/main/database/models/Metric.ts
import { CPUMetric } from '../../collectors/cpu.collector'
import { RAMMetric } from '../../collectors/ram.collector'
import { GPUMetric } from '../../collectors/gpu.collector'
import { DiskMetric } from '../../collectors/disk.collector'
import { TemperatureMetric } from '../../collectors/temperature.collector'
import { BatteryMetric } from '../../collectors/battery.collector'

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

export interface MetricRow {
  id: number
  timestamp: number
  cpu_usage: number
  cpu_temp: number | null
  ram_usage: number
  ram_total: number
  gpu_usage: number | null
  gpu_temp: number | null
  disk_usage: number
  disk_total: number
  data_json: string
}