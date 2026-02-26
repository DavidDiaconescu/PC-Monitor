// src/main/utils/config.ts
import { app } from 'electron'
import path from 'path'

export const APP_NAME = 'PC Monitor'

// app.getVersion() reads version from package.json automatically
export const APP_VERSION: string = app.getVersion()

export function getAppDataPath(): string {
  return app.getPath('userData')
}

export function getDbPath(): string {
  return path.join(getAppDataPath(), 'metrics.db')
}

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}
