import type { ClientEvents } from 'discord.js';
import type { BotContext } from '../types';

export interface EventDefinition<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(context: BotContext, ...args: ClientEvents[K]): Promise<void>;
}
