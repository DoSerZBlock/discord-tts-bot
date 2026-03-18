import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export class GuildSettingsStore {
  private readonly db: Database.Database;
  private readonly guildChannelCache = new Map<string, string>();
  private readonly autoJoinCache = new Map<string, Set<string>>();

  public constructor(databasePath: string) {
    mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_auto_join_settings (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, user_id)
      );
    `);
  }

  public loadAll(): ReadonlyMap<string, string> {
    this.guildChannelCache.clear();
    this.autoJoinCache.clear();

    const rows = this.db.prepare('SELECT guild_id, channel_id FROM guild_settings').all() as Array<{
      guild_id: string;
      channel_id: string;
    }>;

    for (const row of rows) {
      this.guildChannelCache.set(row.guild_id, row.channel_id);
    }

    const autoJoinRows = this.db.prepare('SELECT guild_id, user_id FROM user_auto_join_settings').all() as Array<{
      guild_id: string;
      user_id: string;
    }>;

    for (const row of autoJoinRows) {
      const guildUsers = this.autoJoinCache.get(row.guild_id) ?? new Set<string>();
      guildUsers.add(row.user_id);
      this.autoJoinCache.set(row.guild_id, guildUsers);
    }

    return new Map(this.guildChannelCache);
  }

  public get(guildId: string): string | null {
    return this.guildChannelCache.get(guildId) ?? null;
  }

  public set(guildId: string, channelId: string): void {
    this.db
      .prepare(
        `
          INSERT INTO guild_settings (guild_id, channel_id, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(guild_id) DO UPDATE SET
            channel_id = excluded.channel_id,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .run(guildId, channelId);

    this.guildChannelCache.set(guildId, channelId);
  }

  public clear(guildId: string): boolean {
    const result = this.db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(guildId);
    this.guildChannelCache.delete(guildId);
    return result.changes > 0;
  }

  public isAutoJoinEnabled(guildId: string, userId: string): boolean {
    return this.autoJoinCache.get(guildId)?.has(userId) ?? false;
  }

  public setAutoJoinEnabled(guildId: string, userId: string, enabled: boolean): void {
    if (enabled) {
      this.db
        .prepare(
          `
            INSERT INTO user_auto_join_settings (guild_id, user_id, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET
              updated_at = CURRENT_TIMESTAMP
          `
        )
        .run(guildId, userId);

      const guildUsers = this.autoJoinCache.get(guildId) ?? new Set<string>();
      guildUsers.add(userId);
      this.autoJoinCache.set(guildId, guildUsers);
      return;
    }

    this.db.prepare('DELETE FROM user_auto_join_settings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    const guildUsers = this.autoJoinCache.get(guildId);

    if (!guildUsers) {
      return;
    }

    guildUsers.delete(userId);

    if (guildUsers.size === 0) {
      this.autoJoinCache.delete(guildId);
    }
  }

  public close(): void {
    this.db.close();
  }
}
