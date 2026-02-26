// src/main/collectors/network.collector.ts
import si from 'systeminformation'

export interface NetworkMetric {
  interface: string
  downloadSpeed: number // bytes/s
  uploadSpeed: number // bytes/s
  downloadTotal: number // bytes since boot
  uploadTotal: number // bytes since boot
}

export interface NetworkStats {
  interfaces: NetworkMetric[]
  ping: number | null // ms, null if unreachable
}

// Manual delta state — used only when si hasn't computed rx_sec/tx_sec yet (first call)
let lastRx: Record<string, number> = {}
let lastTx: Record<string, number> = {}
let lastSampleTime = 0

// Rolling average buffers — 3-sample window to smooth out noise
const SMOOTH_WINDOW = 3
let rxHistory: Record<string, number[]> = {}
let txHistory: Record<string, number[]> = {}

function rollingAvg(history: number[], newValue: number): number {
  history.push(newValue)
  if (history.length > SMOOTH_WINDOW) history.shift()
  return history.reduce((a, b) => a + b, 0) / history.length
}

// Patterns that identify loopback/virtual/internal interfaces to exclude.
// These should never appear in bandwidth stats.
const VIRTUAL_PATTERNS = [
  /^lo$/i,           // Linux loopback
  /loopback/i,       // Windows "Loopback Pseudo-Interface"
  /^veth/i,          // Docker veth pairs
  /^br-/i,           // Docker bridge
  /^docker/i,        // Docker default bridge
  /^virbr/i,         // libvirt bridge
  /^vmnet/i,         // VMware
  /^vboxnet/i,       // VirtualBox
  /^utun/i,          // macOS VPN tunnels
  /^tun/i,           // Generic TUN (VPN)
  /^tap/i,           // Generic TAP
]

function isVirtual(name: string): boolean {
  return VIRTUAL_PATTERNS.some((p) => p.test(name))
}

export async function collectNetwork(): Promise<NetworkStats> {
  const [stats, latency] = await Promise.all([
    si.networkStats(),
    si.inetLatency('8.8.8.8').catch(() => 0)
  ])

  const now = Date.now()
  const deltaSeconds = lastSampleTime > 0 ? (now - lastSampleTime) / 1000 : 1
  lastSampleTime = now

  // Filter: skip loopback/virtual adapters; keep interfaces that have ever
  // transferred data (rx_bytes + tx_bytes > 0) OR are clearly named adapters
  const physicalStats = stats.filter((iface) => {
    if (isVirtual(iface.iface)) return false
    // Include if it has ever had any traffic
    if (iface.rx_bytes > 0 || iface.tx_bytes > 0) return true
    // Include even zero-traffic interfaces (they're still real adapters)
    return true
  })

  const interfaces = physicalStats.map((iface) => {
    let rawDown: number
    let rawUp: number

    if (iface.rx_sec !== null && iface.rx_sec !== undefined &&
        iface.tx_sec !== null && iface.tx_sec !== undefined &&
        iface.rx_sec >= 0 && iface.tx_sec >= 0) {
      // si already computed accurate per-second rates — use them directly
      rawDown = iface.rx_sec
      rawUp = iface.tx_sec
    } else {
      // Fallback: manual delta for the very first call when si hasn't warmed up yet
      const prevRx = lastRx[iface.iface] ?? iface.rx_bytes
      const prevTx = lastTx[iface.iface] ?? iface.tx_bytes
      rawDown = Math.max(0, (iface.rx_bytes - prevRx) / deltaSeconds)
      rawUp = Math.max(0, (iface.tx_bytes - prevTx) / deltaSeconds)
    }

    lastRx[iface.iface] = iface.rx_bytes
    lastTx[iface.iface] = iface.tx_bytes

    // Initialise rolling average buffers on first sight of this interface
    if (!rxHistory[iface.iface]) rxHistory[iface.iface] = []
    if (!txHistory[iface.iface]) txHistory[iface.iface] = []

    // Smooth out single-sample spikes with a rolling average
    const smoothDown = rollingAvg(rxHistory[iface.iface], rawDown)
    const smoothUp = rollingAvg(txHistory[iface.iface], rawUp)

    return {
      interface: iface.iface,
      downloadSpeed: Math.round(smoothDown),
      uploadSpeed: Math.round(smoothUp),
      downloadTotal: iface.rx_bytes,
      uploadTotal: iface.tx_bytes
    }
  })

  return {
    interfaces,
    ping: typeof latency === 'number' && latency > 0 ? Math.round(latency) : null
  }
}