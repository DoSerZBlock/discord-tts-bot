import { handleConfigModalSubmit, handleConfigSelect, isConfigModal, isConfigSelect } from '../commands/config';
import { replyEphemeral } from '../commands/utils';
import type { EventDefinition } from './event';

export const interactionCreateEvent: EventDefinition<'interactionCreate'> = {
  name: 'interactionCreate',
  async execute(context, interaction) {
    if (interaction.isStringSelectMenu()) {
      if (!isConfigSelect(interaction.customId)) {
        return;
      }

      try {
        await handleConfigSelect(interaction, context);
      } catch (error) {
        context.logger.error(`Select interaction failed: ${interaction.customId}`, error);
        await replyEphemeral(interaction, {
          title: '發生錯誤',
          description: '更新設定時發生錯誤，請稍後再試。'
        });
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      if (!isConfigModal(interaction.customId)) {
        return;
      }

      try {
        await handleConfigModalSubmit(interaction, context);
      } catch (error) {
        context.logger.error(`Modal interaction failed: ${interaction.customId}`, error);
        await replyEphemeral(interaction, {
          title: '發生錯誤',
          description: '更新設定時發生錯誤，請稍後再試。'
        });
      }

      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = context.commands.get(interaction.commandName);

    if (!command) {
      context.logger.warn(`Received unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, context);
    } catch (error) {
      context.logger.error(`Command execution failed: ${interaction.commandName}`, error);
      await replyEphemeral(interaction, {
        title: '發生錯誤',
        description: '執行指令時發生錯誤，請稍後再試。'
      });
    }
  }
};
