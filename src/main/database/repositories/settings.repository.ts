// src/main/database/repositories/settings.repository.ts
import { getDatabase } from '../index';
import { Settings, defaultSettings } from '../models/Settings';

export class SettingsRepository {
  async get(): Promise<Settings> {
    const db = getDatabase();

    const row = db
      .prepare('SELECT data_json FROM settings WHERE id = 1')
      .get() as { data_json: string } | undefined;

    if (!row) {
      return defaultSettings;
    }

    return JSON.parse(row.data_json) as Settings;
  }

  async update(settings: Settings): Promise<void> {
    const db = getDatabase();

    db.prepare('UPDATE settings SET data_json = ? WHERE id = 1').run(
      JSON.stringify(settings)
    );
  }
}