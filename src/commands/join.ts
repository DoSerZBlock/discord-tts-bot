import { SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { fetchInteractionMember, replyEphemeral } from './utils';

export const joinCommand: CommandDefinition = {
  data: new SlashCommandBuilder().setName('join').setDescription('讓機器人加入你目前所在的語音頻道。'),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const member = await fetchInteractionMember(interaction);
    const voiceChannel = member?.voice.channel ?? null;

    if (!voiceChannel) {
      await replyEphemeral(interaction, '你必須先加入一個語音頻道，機器人才知道要進哪裡。');
      return;
    }

    const boundChannelId = context.settingsStore.get(interaction.guildId);

    if (!boundChannelId) {
      await replyEphemeral(interaction, {
        title: '尚未設定 TTS 頻道',
        description: '這個伺服器還沒有設定 TTS 打字頻道，請先請管理員使用 `/settts`。'
      });
      return;
    }

    const result = await context.queueManager.connect({
      guildId: interaction.guildId,
      textChannelId: boundChannelId,
      voiceChannelId: voiceChannel.id,
      memberDisplayName: member?.displayName ?? interaction.user.displayName,
      content: '',
      speechRate: context.settingsStore.getSpeechRate(interaction.guildId),
      voiceChannel
    });

    if (result.status === 'ignored_locked_to_other_channel') {
      const queueState = context.queueManager.getState(interaction.guildId);
      await replyEphemeral(interaction, {
        title: '目前已鎖定其他語音頻道',
        description: queueState
          ? `機器人目前正在 <#${queueState.lockedVoiceChannelId}> 待機或播放，請先使用 \`/stop\` 讓它離開。`
          : '機器人目前已鎖定其他語音頻道，請先使用 `/stop` 讓它離開。'
      });
      return;
    }

    await replyEphemeral(interaction, {
      title: result.status === 'joined' ? '已加入語音頻道' : '已在語音頻道中',
      description:
        result.status === 'joined'
          ? `我已加入 <#${voiceChannel.id}>，之後會等待綁定文字頻道的新訊息。`
          : `我已經在 <#${voiceChannel.id}> 了，現在會繼續待機。`
    });
  }
};
