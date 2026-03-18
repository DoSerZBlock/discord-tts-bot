import type { EventDefinition } from './event';

export const readyEvent: EventDefinition<'ready'> = {
  name: 'ready',
  once: true,
  async execute(context, client) {
    context.logger.info(`Logged in as ${client.user.tag}. Loaded ${context.commands.size} slash commands.`);
  }
};
