import type { Client } from 'discord.js';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';
import { interactionCreateEvent } from './interactionCreate';
import { messageCreateEvent } from './messageCreate';
import { readyEvent } from './ready';
import { typingStartEvent } from './typingStart';
import { voiceStateUpdateEvent } from './voiceStateUpdate';

const eventDefinitions: EventDefinition[] = [
  readyEvent,
  interactionCreateEvent,
  messageCreateEvent,
  typingStartEvent,
  voiceStateUpdateEvent
];

export function registerEvents(client: Client, context: BotContext): void {
  for (const event of eventDefinitions) {
    const listener = (...args: unknown[]) => {
      Promise.resolve((event.execute as (...input: unknown[]) => Promise<void>)(context, ...args)).catch((error) => {
        context.logger.error(`Unhandled error in event ${event.name}.`, error);
      });
    };

    if (event.once) {
      client.once(event.name, listener);
      continue;
    }

    client.on(event.name, listener);
  }
}
