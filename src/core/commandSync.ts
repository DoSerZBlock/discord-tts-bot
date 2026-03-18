import { REST, Routes } from 'discord.js';
import type { CommandDefinition } from '../commands/command';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';

export type CommandSyncScope = 'guild' | 'global';

export async function syncApplicationCommands(options: {
  config: AppConfig;
  commands: Iterable<CommandDefinition>;
  logger?: Logger;
}): Promise<CommandSyncScope> {
  const rest = new REST({ version: '10' }).setToken(options.config.discordToken);
  const body = Array.from(options.commands, (command) => command.data.toJSON());

  if (options.config.devGuildId) {
    await rest.put(Routes.applicationGuildCommands(options.config.clientId, options.config.devGuildId), { body });
    options.logger?.info(`Registered ${body.length} guild commands for ${options.config.devGuildId}.`);
    return 'guild';
  }

  await rest.put(Routes.applicationCommands(options.config.clientId), { body });
  options.logger?.info(`Registered ${body.length} global commands.`);
  return 'global';
}
