// src/main/ipc/events.ts

export const IPC_EVENTS = {
  METRICS_GET_LATEST: 'metrics:getLatest',
  METRICS_GET_HISTORY: 'metrics:getHistory',
  METRICS_REALTIME_UPDATE: 'metrics:realtimeUpdate',
  ALERTS_GET_RECENT: 'alerts:getRecent',
  ALERTS_CLEAR: 'alerts:clearAll',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  PROCESSES_GET: 'processes:get',
  NETWORK_GET: 'network:get',
  SPEEDTEST_RUN: 'speedtest:run',
  SPEEDTEST_PROGRESS: 'speedtest:progress',
  APP_QUIT: 'app:quit'
} as const

export type IPCEventName = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
