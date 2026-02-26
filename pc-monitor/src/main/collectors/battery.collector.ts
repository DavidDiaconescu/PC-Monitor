// src/main/collectors/battery.collector.ts
import si from 'systeminformation'

export interface BatteryMetric {
  percent: number
  isCharging: boolean
  acConnected: boolean
  hasBattery: boolean
  timeRemaining: number | null // minutes
  health: number | null        // % of designed capacity (maxCapacity / designedCapacity)
  cycleCount: number | null
  voltage: number | null       // Volts
  designedCapacity: number | null // mWh
  maxCapacity: number | null      // mWh (current max — degrades over time)
  currentCapacity: number | null  // mWh (how much is in battery right now)
  capacityUnit: string
  type: string
  model: string
  manufacturer: string
}

export async function collectBattery(): Promise<BatteryMetric | null> {
  const battery = await si.battery()

  if (!battery.hasBattery) {
    return null
  }

  // True health = how much of the original designed capacity remains
  // (NOT the current charge level)
  const health =
    battery.designedCapacity > 0 && battery.maxCapacity > 0
      ? Math.round((battery.maxCapacity / battery.designedCapacity) * 100)
      : null

  return {
    percent: battery.percent,
    isCharging: battery.isCharging,
    acConnected: battery.acConnected,
    hasBattery: battery.hasBattery,
    timeRemaining: battery.timeRemaining > 0 ? battery.timeRemaining : null,
    health,
    cycleCount: battery.cycleCount > 0 ? battery.cycleCount : null,
    voltage: battery.voltage > 0 ? Math.round(battery.voltage * 1000) / 1000 : null,
    designedCapacity: battery.designedCapacity > 0 ? battery.designedCapacity : null,
    maxCapacity: battery.maxCapacity > 0 ? battery.maxCapacity : null,
    currentCapacity: battery.currentCapacity > 0 ? battery.currentCapacity : null,
    capacityUnit: battery.capacityUnit || 'mWh',
    type: battery.type || '',
    model: battery.model || '',
    manufacturer: battery.manufacturer || ''
  }
}