// src/main/utils/logger.ts

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const logger = {
  info(message: string, data?: unknown): void {
    const extra = data !== undefined ? ` ${JSON.stringify(data)}` : ''
    console.log(`[${timestamp()}] [INFO] ${message}${extra}`)
  },

  warn(message: string, data?: unknown): void {
    const extra = data !== undefined ? ` ${JSON.stringify(data)}` : ''
    console.warn(`[${timestamp()}] [WARN] ${message}${extra}`)
  },

  error(message: string, error?: unknown): void {
    const extra =
      error !== undefined
        ? ` ${error instanceof Error ? error.message : JSON.stringify(error)}`
        : ''
    console.error(`[${timestamp()}] [ERROR] ${message}${extra}`)
  },

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      const extra = data !== undefined ? ` ${JSON.stringify(data)}` : ''
      console.debug(`[${timestamp()}] [DEBUG] ${message}${extra}`)
    }
  }
}

export default logger
