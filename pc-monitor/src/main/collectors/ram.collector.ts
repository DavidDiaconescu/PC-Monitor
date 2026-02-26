// src/main/collectors/ram.collector.ts
import si from 'systeminformation'

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

export async function collectRAM(): Promise<RAMMetric> {
  const mem = await si.mem()

  return {
    total: mem.total,
    used: mem.used,
    free: mem.free,
    available: mem.available,
    usagePercent: Math.round((mem.used / mem.total) * 10000) / 100,
    swapTotal: mem.swaptotal,
    swapUsed: mem.swapused,
    swapFree: mem.swapfree
  }
}
