// src/main/database/repositories/metrics.repository.ts
import { getDatabase } from '../index';
import { Metric, MetricRow } from '../models/Metric';

export class MetricsRepository {
  async save(metric: Metric): Promise<void> {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO metrics (
        timestamp, cpu_usage, cpu_temp, ram_usage, ram_total,
        gpu_usage, gpu_temp, disk_usage, disk_total, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Calculate disk totals
    const diskTotal = metric.disk.reduce((sum, d) => sum + d.total, 0);
    const diskUsed = metric.disk.reduce((sum, d) => sum + d.used, 0);
    const diskUsagePercent = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

    stmt.run(
      metric.timestamp,
      metric.cpu.usage,
      metric.cpu.temperature,
      metric.ram.usagePercent,
      metric.ram.total,
      metric.gpu?.usage || null,
      metric.gpu?.temperature || null,
      diskUsagePercent,
      diskTotal,
      JSON.stringify(metric)
    );
  }

  async findLatest(): Promise<Metric | null> {
    const db = getDatabase();

    const row = db
      .prepare('SELECT * FROM metrics ORDER BY timestamp DESC LIMIT 1')
      .get() as MetricRow | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.data_json) as Metric;
  }

  async findByTimeRange(startTime: number, endTime: number): Promise<Metric[]> {
    const db = getDatabase();

    const rows = db
      .prepare('SELECT * FROM metrics WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC')
      .all(startTime, endTime) as MetricRow[];

    return rows.map(row => JSON.parse(row.data_json) as Metric);
  }

  async findRecent(hours: number): Promise<Metric[]> {
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;
    return this.findByTimeRange(startTime, now);
  }

  async deleteOlderThan(timestamp: number): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM metrics WHERE timestamp < ?').run(timestamp);
  }

  async count(): Promise<number> {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM metrics').get() as { count: number };
    return result.count;
  }
}