import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { replyEphemeral } from './utils';

export const clearTtsCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('cleartts')
    .setDescription('移除目前伺服器的 TTS 綁定頻道。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const removed = context.settingsStore.clear(interaction.guildId);

    await replyEphemeral(
      interaction,
      removed ? '已移除這個伺服器的 TTS 綁定。' : '這個伺服器目前沒有設定任何 TTS 綁定。'
    );
  }
};
