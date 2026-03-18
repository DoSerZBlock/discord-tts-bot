import { commandDefinitions } from './commands';
import { loadConfig } from './config';
import { syncApplicationCommands } from './core/commandSync';
import { logger } from './logger';

async function registerCommands(): Promise<void> {
  const config = loadConfig();
  await syncApplicationCommands({
    config,
    commands: commandDefinitions,
    logger
  });
}

registerCommands().catch((error) => {
  logger.error('Command registration failed.', error);
  process.exitCode = 1;
});
