import type { Collection } from 'discord.js';
import type { CommandDefinition } from './commands/command';
import type { AppConfig } from './config';
import type { GuildSettingsStore } from './core/db';
import type { QueueManager } from './core/queue';
import type { Logger } from './logger';

export interface BotContext {
  config: AppConfig;
  logger: Logger;
  settingsStore: GuildSettingsStore;
  queueManager: QueueManager;
  commands: Collection<string, CommandDefinition>;
}
