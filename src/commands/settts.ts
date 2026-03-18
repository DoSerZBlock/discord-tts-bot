import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { replyEphemeral } from './utils';

export const setTtsCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('settts')
    .setDescription('設定要監聽並朗讀的文字頻道。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('要綁定的文字頻道')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    context.settingsStore.set(interaction.guildId, channel.id);
    context.queueManager.updateBoundTextChannel(interaction.guildId, channel.id);

    await replyEphemeral(interaction, `已將 TTS 綁定到 <#${channel.id}>。`);
  }
};
