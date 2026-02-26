// src/main/utils/notifications.ts
import { Notification, BrowserWindow } from 'electron'

export function showNotification(title: string, body: string, onClick?: () => void): Notification {
  const notification = new Notification({ title, body })

  notification.on('click', () => {
    // Focus the main window when the user clicks the notification
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const win = windows[0]
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
    onClick?.()
  })

  notification.show()
  return notification
}
