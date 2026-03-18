import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder
} from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type { BotContext } from '../types';
import type { CommandDefinition } from './command';
import { replyEphemeral, updateEphemeralButton } from './utils';

const AUTO_JOIN_ON_CUSTOM_ID = 'config:autojoin:on';
const AUTO_JOIN_OFF_CUSTOM_ID = 'config:autojoin:off';

function buildConfigComponents(enabled: boolean): Array<ActionRowBuilder<ButtonBuilder>> {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(AUTO_JOIN_ON_CUSTOM_ID)
        .setLabel('開啟自動進語音')
        .setStyle(ButtonStyle.Success)
        .setDisabled(enabled),
      new ButtonBuilder()
        .setCustomId(AUTO_JOIN_OFF_CUSTOM_ID)
        .setLabel('關閉自動進語音')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!enabled)
    )
  ];
}

function buildConfigReply(enabled: boolean) {
  return {
    title: '個人設定',
    description: '調整你在這個伺服器的個人設定。',
    fields: [
      {
        name: '自動進入語音',
        value: enabled
          ? '已開啟。當你已在語音頻道中，並在綁定打字頻道開始打字或發送訊息時，機器人會自動進入。'
          : '已關閉。你需要手動使用 `/join`，單純打字或發送訊息不會自動把機器人叫進來。',
        inline: false
      },
      {
        name: '生效條件',
        value: '伺服器必須先設定 `/settts`，你自己必須已在語音中，而且機器人不能已經鎖定在其他語音頻道。',
        inline: false
      }
    ],
    components: buildConfigComponents(enabled)
  };
}

export function isConfigButton(customId: string): boolean {
  return customId === AUTO_JOIN_ON_CUSTOM_ID || customId === AUTO_JOIN_OFF_CUSTOM_ID;
}

export async function handleConfigButton(interaction: ButtonInteraction, context: BotContext): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEphemeral(interaction, '這個操作只能在伺服器內使用。');
    return;
  }

  const enabled = interaction.customId === AUTO_JOIN_ON_CUSTOM_ID;
  context.settingsStore.setAutoJoinEnabled(interaction.guildId, interaction.user.id, enabled);

  await updateEphemeralButton(interaction, buildConfigReply(enabled));
}

export const configCommand: CommandDefinition = {
  data: new SlashCommandBuilder().setName('config').setDescription('查看並調整你的個人設定。'),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    const enabled = context.settingsStore.isAutoJoinEnabled(interaction.guildId, interaction.user.id);
    await replyEphemeral(interaction, buildConfigReply(enabled));
  }
};
