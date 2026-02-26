// src/main/tray.ts
import { Tray, Menu, app } from 'electron'
import { createTrayIcon } from './assets/tray-icon'
import { showWindow, hideWindow, toggleWindow, getWindow } from './window'
import { Metric } from './database/models/Metric'
import logger from './utils/logger'

let tray: Tray | null = null

function buildMenu(cpuLabel = '--', ramLabel = '--', gpuLabel: string | null = null): Menu {
  const win = getWindow()
  const isVisible = win?.isVisible() ?? false

  return Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Window' : 'Show Window',
      type: 'normal',
      click: () => (isVisible ? hideWindow() : showWindow())
    },
    { type: 'separator' },
    { label: `CPU: ${cpuLabel}%`, enabled: false },
    { label: `RAM: ${ramLabel}%`, enabled: false },
    // GPU entry only when data is available
    ...(gpuLabel !== null ? [{ label: `GPU: ${gpuLabel}%`, enabled: false as const }] : []),
    { type: 'separator' as const },
    { label: 'Quit', click: () => app.quit() }
  ])
}

export function createTray(): Tray {
  const icon = createTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('PC Monitor — Click to show')
  tray.setContextMenu(buildMenu())

  // Left-click: toggle window (macOS and Linux)
  tray.on('click', () => toggleWindow())

  // Double-click: show window (Windows convention)
  tray.on('double-click', () => showWindow())

  // Right-click on Windows: explicitly show context menu
  if (process.platform === 'win32') {
    tray.on('right-click', () => {
      tray?.popUpContextMenu()
    })
  }

  logger.info('System tray created')
  return tray
}

export function updateTrayStats(metric: Metric): void {
  if (!tray || tray.isDestroyed()) return

  const cpu = metric.cpu.usage.toFixed(1)
  const ram = metric.ram.usagePercent.toFixed(1)
  const gpu = metric.gpu !== null && metric.gpu.usage !== null && metric.gpu.usage > 0 ? metric.gpu.usage.toFixed(1) : null

  const gpuLine = gpu !== null ? `  GPU: ${gpu}%` : ''
  tray.setToolTip(`PC Monitor\nCPU: ${cpu}%  RAM: ${ram}%${gpuLine}`)
  tray.setContextMenu(buildMenu(cpu, ram, gpu))
}
