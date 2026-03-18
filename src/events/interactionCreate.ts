import { handleConfigButton, isConfigButton } from '../commands/config';
import { replyEphemeral } from '../commands/utils';
import type { EventDefinition } from './event';

export const interactionCreateEvent: EventDefinition<'interactionCreate'> = {
  name: 'interactionCreate',
  async execute(context, interaction) {
    if (interaction.isButton()) {
      if (!isConfigButton(interaction.customId)) {
        return;
      }

      try {
        await handleConfigButton(interaction, context);
      } catch (error) {
        context.logger.error(`Button interaction failed: ${interaction.customId}`, error);
        await replyEphemeral(interaction, {
          title: '發生錯誤',
          description: '更新個人設定時發生錯誤，請稍後再試。'
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
