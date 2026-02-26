// src/renderer/src/utils/formatters.ts

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`

  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateFull(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatSpeed(bytesPerSec: number): string {
  const mb = bytesPerSec / (1024 * 1024)
  // Use 3 decimal places so values like 0.001 MB/s show as "0.001" not "0.00"
  if (mb >= 100) return `${mb.toFixed(1)} MB/s`
  if (mb >= 10) return `${mb.toFixed(2)} MB/s`
  return `${mb.toFixed(3)} MB/s`
}

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024)
}

export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`
}

export function getUsageColor(percent: number): string {
  if (percent >= 85) return 'text-red-400'
  if (percent >= 70) return 'text-yellow-400'
  return 'text-green-400'
}

export function getUsageBgColor(percent: number): string {
  if (percent >= 85) return 'bg-red-500'
  if (percent >= 70) return 'bg-yellow-500'
  return 'bg-blue-500'
}

export function getTempColor(celsius: number): string {
  if (celsius >= 85) return 'text-red-400'
  if (celsius >= 70) return 'text-yellow-400'
  return 'text-green-400'
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}