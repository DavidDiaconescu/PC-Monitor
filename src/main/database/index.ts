// src/main/database/index.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  // Get user data path
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'metrics.db');

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Open database
  db = new Database(dbPath, { verbose: console.log });

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  console.log(`Database initialized at: ${dbPath}`);
}

function runMigrations(db: Database.Database): void {
  // Create metrics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_usage REAL NOT NULL,
      cpu_temp REAL,
      ram_usage REAL NOT NULL,
      ram_total INTEGER NOT NULL,
      gpu_usage REAL,
      gpu_temp REAL,
      disk_usage REAL NOT NULL,
      disk_total INTEGER NOT NULL,
      data_json TEXT NOT NULL
    );
  `);

  // Create index on timestamp
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
    ON metrics(timestamp DESC);
  `);

  // Create alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL
    );
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data_json TEXT NOT NULL
    );
  `);

  // Insert default settings if not exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const { defaultSettings } = require('./models/Settings');
    db.prepare('INSERT INTO settings (id, data_json) VALUES (1, ?)').run(
      JSON.stringify(defaultSettings)
    );
  }

  console.log('Database migrations completed');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}