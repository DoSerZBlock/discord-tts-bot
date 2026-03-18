import { Client, GatewayIntentBits } from 'discord.js';
import { createCommandCollection } from './commands';
import { loadConfig } from './config';
import { GuildSettingsStore } from './core/db';
import { QueueManager } from './core/queue';
import { GoogleTtsService } from './core/tts';
import { registerEvents } from './events';
import { logger } from './logger';
import type { BotContext } from './types';

async function main(): Promise<void> {
  const config = loadConfig();
  const settingsStore = new GuildSettingsStore(config.databasePath);
  settingsStore.loadAll();

  const queueManager = new QueueManager({
    logger,
    ttsService: new GoogleTtsService(config.ttsLanguage)
  });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent
    ]
  });

  const context: BotContext = {
    config,
    logger,
    settingsStore,
    queueManager,
    commands: createCommandCollection()
  };

  registerEvents(client, context);

  const shutdown = (): void => {
    logger.info('Shutting down bot.');
    queueManager.destroyAll();
    settingsStore.close();
    client.destroy();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await client.login(config.discordToken);
}

main().catch((error) => {
  logger.error('Failed to start Discord TTS bot.', error);
  process.exitCode = 1;
});
