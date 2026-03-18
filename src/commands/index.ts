import { Collection } from 'discord.js';
import type { CommandDefinition } from './command';
import { clearTtsCommand } from './cleartts';
import { configCommand } from './config';
import { joinCommand } from './join';
import { setTtsCommand } from './settts';
import { skipCommand } from './skip';
import { stopCommand } from './stop';
import { syncCommand } from './sync';
import { ttsStatusCommand } from './ttsstatus';

export const commandDefinitions: CommandDefinition[] = [
  syncCommand,
  configCommand,
  setTtsCommand,
  clearTtsCommand,
  ttsStatusCommand,
  joinCommand,
  skipCommand,
  stopCommand
];

export function createCommandCollection(): Collection<string, CommandDefinition> {
  return new Collection(commandDefinitions.map((command) => [command.data.name, command]));
}
