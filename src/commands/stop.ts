import { SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { fetchInteractionMember, replyEphemeral } from './utils';

export const stopCommand: CommandDefinition = {
  data: new SlashCommandBuilder().setName('stop').setDescription('清空目前佇列並讓機器人退出語音頻道。'),
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

    const result = context.queueManager.stop(interaction.guildId);

    await replyEphemeral(
      interaction,
      result === 'stopped' ? '已清空目前的 TTS 佇列並退出語音頻道。' : '機器人目前沒有連線到任何語音頻道。'
    );
  }
};
