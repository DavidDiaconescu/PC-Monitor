// src/main/services/speedtest.service.ts
//
// Speed test using Cloudflare's public speed.cloudflare.com endpoints.
// Methodology matches Ookla's approach:
//   1. Latency: 5 sequential pings → median
//   2. Download: N parallel TCP streams downloading 25 MB each → total throughput
//   3. Upload: N parallel TCP streams POSTing 10 MB each → total throughput
//
import https from 'https'
import { IncomingMessage } from 'http'

export interface SpeedTestProgress {
  phase: 'latency' | 'download' | 'upload' | 'done' | 'error'
  latency?: number       // ms (median)
  downloadMbps?: number  // Megabits per second
  uploadMbps?: number    // Megabits per second
  progress: number       // 0–100
  error?: string
}

export type SpeedTestCallback = (update: SpeedTestProgress) => void

// ─── Cloudflare endpoints ─────────────────────────────────────────────────────
const CF_HOST = 'speed.cloudflare.com'
const PARALLEL  = 4           // simultaneous streams (Ookla uses 4–8)
const DL_BYTES  = 25_000_000  // 25 MB per download stream
const UL_BYTES  = 10_000_000  // 10 MB per upload stream

function bytesToMbps(bytes: number, seconds: number): number {
  return (bytes * 8) / (seconds * 1_000_000)
}

// ─── Single GET request ───────────────────────────────────────────────────────
function httpsGet(path: string): Promise<{ received: number; ms: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    let received = 0

    const options = {
      hostname: CF_HOST,
      path,
      method: 'GET',
      headers: { 'User-Agent': 'pc-monitor/1.0 speedtest' }
    }

    const req = https.request(options, (res: IncomingMessage) => {
      res.on('data', (chunk: Buffer) => { received += chunk.length })
      res.on('end', () => resolve({ received, ms: Date.now() - start }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error('Request timed out')) })
    req.end()
  })
}

// ─── Single POST request ──────────────────────────────────────────────────────
function httpsPost(path: string, body: Buffer): Promise<{ sent: number; ms: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    const options = {
      hostname: CF_HOST,
      path,
      method: 'POST',
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/octet-stream',
        'User-Agent': 'pc-monitor/1.0 speedtest'
      }
    }

    const req = https.request(options, (res: IncomingMessage) => {
      res.resume() // drain the response
      res.on('end', () => resolve({ sent: body.length, ms: Date.now() - start }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(60_000, () => { req.destroy(); reject(new Error('Upload timed out')) })
    req.write(body)
    req.end()
  })
}

// ─── Latency test ─────────────────────────────────────────────────────────────
async function measureLatency(): Promise<number> {
  const times: number[] = []
  for (let i = 0; i < 5; i++) {
    try {
      const { ms } = await httpsGet(`/__down?measId=latency-${i}&bytes=1000`)
      times.push(ms)
    } catch {
      // skip failed pings
    }
  }
  if (times.length === 0) return 0
  times.sort((a, b) => a - b)
  // Return median
  return times[Math.floor(times.length / 2)]
}

// ─── Download test ────────────────────────────────────────────────────────────
async function measureDownload(): Promise<number> {
  const urls = Array.from(
    { length: PARALLEL },
    (_, i) => `/__down?measId=dl-${i}&bytes=${DL_BYTES}`
  )
  const start = Date.now()
  const results = await Promise.all(urls.map((url) => httpsGet(url)))
  const totalBytes = results.reduce((s, r) => s + r.received, 0)
  const durationSec = (Date.now() - start) / 1000
  return bytesToMbps(totalBytes, durationSec)
}

// ─── Upload test ──────────────────────────────────────────────────────────────
async function measureUpload(): Promise<number> {
  // Allocate once and reuse across all streams to avoid OOM
  const body = Buffer.alloc(UL_BYTES)
  const start = Date.now()
  const results = await Promise.all(
    Array.from({ length: PARALLEL }, () => httpsPost('/__up', body))
  )
  const totalBytes = results.reduce((s, r) => s + r.sent, 0)
  const durationSec = (Date.now() - start) / 1000
  return bytesToMbps(totalBytes, durationSec)
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function runSpeedTest(callback: SpeedTestCallback): Promise<void> {
  let latency = 0
  let downloadMbps = 0

  try {
    // Phase 1: Latency
    callback({ phase: 'latency', progress: 5 })
    latency = await measureLatency()
    callback({ phase: 'latency', latency, progress: 20 })

    // Phase 2: Download (4 parallel × 25 MB)
    callback({ phase: 'download', latency, progress: 25 })
    downloadMbps = await measureDownload()
    callback({ phase: 'download', latency, downloadMbps, progress: 65 })

    // Phase 3: Upload (4 parallel × 10 MB)
    callback({ phase: 'upload', latency, downloadMbps, progress: 70 })
    const uploadMbps = await measureUpload()

    callback({
      phase: 'done',
      latency,
      downloadMbps,
      uploadMbps,
      progress: 100
    })
  } catch (err) {
    callback({
      phase: 'error',
      latency: latency || undefined,
      downloadMbps: downloadMbps || undefined,
      progress: 0,
      error: err instanceof Error ? err.message : String(err)
    })
  }
}