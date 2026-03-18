import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandDefinition } from './command';
import { replyEphemeral } from './utils';

export const ttsStatusCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('ttsstatus')
    .setDescription('查看目前綁定頻道與播放狀態。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const boundChannelId = context.settingsStore.get(interaction.guildId);
    const queueState = context.queueManager.getState(interaction.guildId);

    const lines = [
      `綁定文字頻道：${boundChannelId ? `<#${boundChannelId}>` : '未設定'}`,
      `播放狀態：${
        queueState ? `已連線 <#${queueState.lockedVoiceChannelId}>，待播 ${queueState.pendingCount} 筆` : '目前沒有語音連線'
      }`
    ];

    if (queueState) {
      const remainingMinutes = Math.max(0, Math.ceil((queueState.inactivityDeadlineAt - Date.now()) / 60000));
      lines.push(`活動監聽頻道：<#${queueState.boundTextChannelId}>`);
      lines.push(`文字頻道閒置退出：${remainingMinutes} 分鐘後`);
    }

    if (queueState?.currentItem) {
      lines.push(`目前朗讀：${queueState.currentItem.memberDisplayName} - ${queueState.currentItem.content}`);
    } else if (queueState) {
      lines.push('目前朗讀：待機中');
    }

    await replyEphemeral(interaction, lines.join('\n'));
  }
};
