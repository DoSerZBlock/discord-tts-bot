import { SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { fetchInteractionMember, replyEphemeral } from './utils';

export const skipCommand: CommandDefinition = {
  data: new SlashCommandBuilder().setName('skip').setDescription('跳過目前正在播放的 TTS。'),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const queueState = context.queueManager.getState(interaction.guildId);

    if (!queueState) {
      await replyEphemeral(interaction, '目前沒有活躍的 TTS 播放。');
      return;
    }

    const member = await fetchInteractionMember(interaction);
    const memberVoiceChannelId = member?.voice.channelId ?? null;

    if (!memberVoiceChannelId) {
      await replyEphemeral(interaction, '你必須先加入目前正在播放的語音頻道，才能使用這個指令。');
      return;
    }

    if (memberVoiceChannelId !== queueState.lockedVoiceChannelId) {
      await replyEphemeral(interaction, `你必須加入 <#${queueState.lockedVoiceChannelId}> 才能使用這個指令。`);
      return;
    }

    const result = context.queueManager.skip(interaction.guildId);

    await replyEphemeral(
      interaction,
      result === 'skipped' ? '已跳過目前播放中的 TTS。' : '目前沒有可跳過的播放內容。'
    );
  }
};
