// src/main/collectors/processes.collector.ts
import si from 'systeminformation'

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

export async function collectProcesses(): Promise<ProcessMetric[]> {
  const result = await si.processes()

  return result.list
    // Include every named process with pid > 0.
    // Windows often reports memRss = 0 via WMI while mem (%) and memVsz are populated;
    // the broader filter ensures no real process is excluded.
    .filter((p) => p.pid > 0 && p.name && p.name.length > 0)
    .sort((a, b) => {
      // Primary: sort by CPU usage descending
      const cpuDiff = b.cpu - a.cpu
      if (cpuDiff !== 0) return cpuDiff
      // Secondary: sort by memory % descending
      return b.mem - a.mem
    })
    .slice(0, 150)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: Math.round(p.cpu * 100) / 100,
      mem: Math.round(p.mem * 100) / 100,
      memVsz: p.memVsz ?? 0,
      memRss: p.memRss ?? 0,
      started: p.started ?? '',
      state: p.state ?? '',
      user: p.user ?? '',
      command: p.command ?? ''
    }))
}