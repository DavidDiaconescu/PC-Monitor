// src/main/window.ts
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let _window: BrowserWindow | null = null

export function getWindow(): BrowserWindow | null {
  return _window
}

export function showWindow(): void {
  if (!_window || _window.isDestroyed()) return
  if (_window.isMinimized()) _window.restore()
  _window.show()
  _window.focus()
}

export function hideWindow(): void {
  if (!_window || _window.isDestroyed()) return
  _window.hide()
}

export function toggleWindow(): void {
  if (!_window || _window.isDestroyed()) return
  if (_window.isVisible()) {
    _window.hide()
  } else {
    showWindow()
  }
}

export function createWindow(): BrowserWindow {
  _window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // shown via ready-to-show below
    autoHideMenuBar: true,
    // Windows / Linux use the PNG icon; macOS uses the .icns in the app bundle
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show as soon as the first frame is ready — avoids white flash
  _window.once('ready-to-show', () => {
    _window!.show()
  })

  // Minimize to tray instead of closing
  _window.on('close', (e) => {
    e.preventDefault()
    _window!.hide()
  })

  _window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    _window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    _window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return _window
}
