import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { GuildSettingsStore } from '../src/core/db';

const createdDirs: string[] = [];

function createDatabasePath(): string {
  const tempDir = path.resolve(process.cwd(), 'temp', 'runtime-tests', randomUUID());
  mkdirSync(tempDir, { recursive: true });
  createdDirs.push(tempDir);
  return path.join(tempDir, 'tts_config.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const directory = createdDirs.pop();

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe('GuildSettingsStore', () => {
  it('stores and overwrites guild bindings', () => {
    const store = new GuildSettingsStore(createDatabasePath());

    store.loadAll();
    store.set('guild-1', 'channel-1');
    store.set('guild-1', 'channel-2');

    expect(store.get('guild-1')).toBe('channel-2');
    store.close();
  });

  it('clears stored bindings', () => {
    const store = new GuildSettingsStore(createDatabasePath());

    store.loadAll();
    store.set('guild-1', 'channel-1');

    expect(store.clear('guild-1')).toBe(true);
    expect(store.get('guild-1')).toBeNull();
    store.close();
  });

  it('reloads cache from sqlite on restart', () => {
    const databasePath = createDatabasePath();
    const firstStore = new GuildSettingsStore(databasePath);

    firstStore.loadAll();
    firstStore.set('guild-1', 'channel-1');
    firstStore.close();

    const secondStore = new GuildSettingsStore(databasePath);
    secondStore.loadAll();

    expect(secondStore.get('guild-1')).toBe('channel-1');
    secondStore.close();
  });

  it('stores and clears per-user auto join settings', () => {
    const store = new GuildSettingsStore(createDatabasePath());

    store.loadAll();
    store.setAutoJoinEnabled('guild-1', 'user-1', true);

    expect(store.isAutoJoinEnabled('guild-1', 'user-1')).toBe(true);

    store.setAutoJoinEnabled('guild-1', 'user-1', false);

    expect(store.isAutoJoinEnabled('guild-1', 'user-1')).toBe(false);
    store.close();
  });

  it('stores and reloads per-guild speech rate settings', () => {
    const databasePath = createDatabasePath();
    const firstStore = new GuildSettingsStore(databasePath);

    firstStore.loadAll();
    expect(firstStore.getSpeechRate('guild-1')).toBe(1);
    firstStore.setSpeechRate('guild-1', 1.25);
    expect(firstStore.getSpeechRate('guild-1')).toBe(1.25);
    firstStore.close();

    const secondStore = new GuildSettingsStore(databasePath);
    secondStore.loadAll();

    expect(secondStore.getSpeechRate('guild-1')).toBe(1.25);
    secondStore.close();
  });

  it('stores and reloads per-guild voice role settings', () => {
    const databasePath = createDatabasePath();
    const firstStore = new GuildSettingsStore(databasePath);

    firstStore.loadAll();
    expect(firstStore.getVoiceRoleSettings('guild-1')).toEqual({ enabled: false, roleId: null });
    firstStore.setVoiceRoleId('guild-1', 'role-1');
    firstStore.setVoiceRoleEnabled('guild-1', true);
    expect(firstStore.getVoiceRoleSettings('guild-1')).toEqual({ enabled: true, roleId: 'role-1' });
    firstStore.close();

    const secondStore = new GuildSettingsStore(databasePath);
    secondStore.loadAll();

    expect(secondStore.getVoiceRoleSettings('guild-1')).toEqual({ enabled: true, roleId: 'role-1' });
    secondStore.setVoiceRoleEnabled('guild-1', false);
    expect(secondStore.getVoiceRoleSettings('guild-1')).toEqual({ enabled: false, roleId: 'role-1' });
    secondStore.close();
  });

  it('loads legacy speech-rate values stored as normal or slow', () => {
    const databasePath = createDatabasePath();
    const store = new GuildSettingsStore(databasePath);

    store.close();

    const db = new Database(databasePath);
    db.prepare(
      `
        INSERT INTO guild_tts_settings (guild_id, speech_rate)
        VALUES (?, ?), (?, ?)
      `
    ).run('guild-normal', 'normal', 'guild-slow', 'slow');
    db.close();

    const reloadedStore = new GuildSettingsStore(databasePath);
    reloadedStore.loadAll();

    expect(reloadedStore.getSpeechRate('guild-normal')).toBe(1);
    expect(reloadedStore.getSpeechRate('guild-slow')).toBe(0.75);
    reloadedStore.close();
  });
});
