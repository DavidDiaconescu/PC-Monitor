// src/main/database/models/Alert.ts
export interface Alert {
  id?: number
  timestamp: number
  type: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}
