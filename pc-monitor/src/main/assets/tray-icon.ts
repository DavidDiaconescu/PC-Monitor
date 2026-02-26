// src/main/assets/tray-icon.ts
// Generates a 16x16 monitor icon programmatically — no external files needed.
import zlib from 'zlib'
import { nativeImage, NativeImage } from 'electron'

// --- Minimal CRC32 for PNG chunks ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(data: Buffer): number {
  let c = 0xffffffff
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// --- 16x16 monitor shape (black on transparent) ---
function getPixel(x: number, y: number): [number, number, number, number] {
  const W = 16,
    H = 16

  // Screen rectangle border: rows 1-11, cols 1-14
  const inScreen = x >= 1 && x <= W - 2 && y >= 1 && y <= H - 5
  const isScreenBorder = inScreen && (x === 1 || x === W - 2 || y === 1 || y === H - 5)

  // Stand: 2px wide centered pillar, rows 12-13
  const cx = Math.floor(W / 2)
  const isStand = (x === cx - 1 || x === cx) && y >= H - 4 && y <= H - 3

  // Base: 6px wide bar at bottom
  const isBase = y === H - 2 && x >= cx - 3 && x <= cx + 2

  return isScreenBorder || isStand || isBase ? [0, 0, 0, 255] : [0, 0, 0, 0]
}

function buildPNG(width: number, height: number): Buffer {
  // Build raw filtered rows (filter=0 per row)
  const rows: number[] = []
  for (let y = 0; y < height; y++) {
    rows.push(0) // row filter: None
    for (let x = 0; x < width; x++) {
      rows.push(...getPixel(x, y))
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rows))

  // IHDR: width(4) height(4) bitDepth colorType compress filter interlace
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 8-bit depth
  ihdr[9] = 6 // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG sig
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

export function createTrayIcon(): NativeImage {
  const png = buildPNG(16, 16)
  const img = nativeImage.createFromBuffer(png)

  // macOS template images automatically adapt to light/dark menu bar
  if (process.platform === 'darwin') {
    img.setTemplateImage(true)
  }

  return img
}
