import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { replyEphemeral } from './utils';
import { syncApplicationCommands } from '../core/commandSync';

export const syncCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('重新同步目前 bot 的 slash commands。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const scope = await syncApplicationCommands({
      config: context.config,
      commands: context.commands.values(),
      logger: context.logger
    });

    if (scope === 'guild') {
      await replyEphemeral(
        interaction,
        `已同步目前這組 slash commands 到開發 guild \`${context.config.devGuildId}\`。`
      );
      return;
    }

    await replyEphemeral(interaction, '已開始同步全域 slash commands。Discord 端可能需要幾分鐘才會更新。');
  }
};
