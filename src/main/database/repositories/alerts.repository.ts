// src/main/database/repositories/alerts.repository.ts
import { getDatabase } from '../index';
import { Alert } from '../models/Alert';

export class AlertsRepository {
  async save(alert: Alert): Promise<void> {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO alerts (timestamp, type, title, message, severity)
      VALUES (?, ?, ?, ?, ?)
    `).run(alert.timestamp, alert.type, alert.title, alert.message, alert.severity);
  }

  async findRecent(limit: number = 50): Promise<Alert[]> {
    const db = getDatabase();

    return db
      .prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Alert[];
  }

  async deleteAll(): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM alerts').run();
  }

  async deleteOlderThan(timestamp: number): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM alerts WHERE timestamp < ?').run(timestamp);
  }
}