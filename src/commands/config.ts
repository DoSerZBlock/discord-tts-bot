import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { ChatInputCommandInteraction, ModalSubmitInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction } from 'discord.js';
import {
  formatTtsSpeechRate,
  getTtsSpeechRateLabel,
  MAX_TTS_SPEECH_RATE,
  MIN_TTS_SPEECH_RATE,
  parseTtsSpeechRate,
  TTS_SPEECH_RATE_PRESETS,
  type TtsSpeechRate
} from '../core/ttsSettings';
import type { BotContext } from '../types';
import type { CommandDefinition } from './command';
import { replyEphemeral, updateEphemeralComponent } from './utils';

const CONFIG_PANEL_CUSTOM_ID = 'config:panel';
const AUTO_JOIN_CUSTOM_ID = 'config:autojoin';
const SPEECH_RATE_CUSTOM_ID = 'config:speech-rate';
const SPEECH_RATE_MODAL_CUSTOM_ID = 'config:speech-rate:modal';
const SPEECH_RATE_INPUT_CUSTOM_ID = 'config:speech-rate:input';
const VOICE_ROLE_TOGGLE_CUSTOM_ID = 'config:voice-role:toggle';
const VOICE_ROLE_SELECT_CUSTOM_ID = 'config:voice-role:select';
const CUSTOM_SPEECH_RATE_VALUE = 'custom';

type ConfigSection = 'personal_autojoin' | 'guild_speech_rate' | 'guild_voice_role';
type ConfigInteraction =
  | ChatInputCommandInteraction
  | StringSelectMenuInteraction
  | RoleSelectMenuInteraction
  | ModalSubmitInteraction;

function hasManageGuildPermission(interaction: ConfigInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

function resolveConfigSection(value: string | undefined): ConfigSection {
  if (value === 'guild_speech_rate' || value === 'guild_voice_role') {
    return value;
  }

  return 'personal_autojoin';
}

function isSameSpeechRate(left: TtsSpeechRate, right: TtsSpeechRate): boolean {
  return Math.abs(left - right) < 0.005;
}

function getPresetValue(rate: TtsSpeechRate): string {
  return `preset:${formatTtsSpeechRate(rate).replace(/x$/, '')}`;
}

function buildSectionSelector(selectedSection: ConfigSection): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CONFIG_PANEL_CUSTOM_ID)
      .setPlaceholder('選擇要調整的設定')
      .addOptions(
        {
          label: '個人自動進語音',
          description: '控制你打字或發訊息時是否自動把機器人叫進來',
          value: 'personal_autojoin',
          default: selectedSection === 'personal_autojoin'
        },
        {
          label: '伺服器 TTS 倍速',
          description: '調整這個伺服器的機器人朗讀倍速',
          value: 'guild_speech_rate',
          default: selectedSection === 'guild_speech_rate'
        },
        {
          label: '語音身分組',
          description: '有人進入任何語音頻道時，自動給指定身分組',
          value: 'guild_voice_role',
          default: selectedSection === 'guild_voice_role'
        }
      )
  );
}

function buildAutoJoinSelector(enabled: boolean): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(AUTO_JOIN_CUSTOM_ID)
      .setPlaceholder('調整自動進語音')
      .addOptions(
        {
          label: '開啟',
          description: '當你在語音中並於綁定頻道活動時，自動讓機器人加入',
          value: 'on',
          default: enabled
        },
        {
          label: '關閉',
          description: '需要手動使用 /join 才會讓機器人進入語音',
          value: 'off',
          default: !enabled
        }
      )
  );
}

function buildSpeechRateSelector(
  speechRate: TtsSpeechRate,
  disabled: boolean
): ActionRowBuilder<StringSelectMenuBuilder> {
  const hasPresetMatch = TTS_SPEECH_RATE_PRESETS.some((preset) => isSameSpeechRate(preset, speechRate));
  const options = [];

  if (!hasPresetMatch) {
    options.push({
      label: `目前值 ${formatTtsSpeechRate(speechRate)}`,
      description: '目前正在使用的自訂倍速',
      value: getPresetValue(speechRate),
      default: true
    });
  }

  for (const preset of TTS_SPEECH_RATE_PRESETS) {
    options.push({
      label: getTtsSpeechRateLabel(preset),
      description: preset === 1 ? '預設朗讀速度' : `將朗讀速度設為 ${formatTtsSpeechRate(preset)}`,
      value: getPresetValue(preset),
      default: hasPresetMatch && isSameSpeechRate(preset, speechRate)
    });
  }

  options.push({
    label: '自訂輸入',
    description: `輸入 ${MIN_TTS_SPEECH_RATE}x 到 ${MAX_TTS_SPEECH_RATE}x 的自訂倍速`,
    value: CUSTOM_SPEECH_RATE_VALUE,
    default: false
  });

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SPEECH_RATE_CUSTOM_ID)
      .setPlaceholder(`目前倍速 ${formatTtsSpeechRate(speechRate)}`)
      .setDisabled(disabled)
      .addOptions(options)
  );
}

function buildSpeechRateModal(currentSpeechRate: TtsSpeechRate): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(SPEECH_RATE_MODAL_CUSTOM_ID)
    .setTitle('設定伺服器 TTS 倍速')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(SPEECH_RATE_INPUT_CUSTOM_ID)
          .setLabel(`輸入 ${MIN_TTS_SPEECH_RATE}x 到 ${MAX_TTS_SPEECH_RATE}x`)
          .setPlaceholder('例如 1.25')
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setValue(formatTtsSpeechRate(currentSpeechRate).replace(/x$/, ''))
      )
    );
}

function buildVoiceRoleToggleSelector(enabled: boolean, disabled: boolean): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(VOICE_ROLE_TOGGLE_CUSTOM_ID)
      .setPlaceholder('調整語音身分組功能')
      .setDisabled(disabled)
      .addOptions(
        {
          label: '開啟',
          description: '有人進入任一語音頻道時，自動給指定身分組',
          value: 'on',
          default: enabled
        },
        {
          label: '關閉',
          description: '停止自動給語音身分組',
          value: 'off',
          default: !enabled
        }
      )
  );
}

function buildVoiceRoleSelector(disabled: boolean): ActionRowBuilder<RoleSelectMenuBuilder> {
  return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(VOICE_ROLE_SELECT_CUSTOM_ID)
      .setPlaceholder('選擇要自動給予的身分組')
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
  );
}

function buildConfigReply(options: {
  selectedSection: ConfigSection;
  autoJoinEnabled: boolean;
  speechRate: TtsSpeechRate;
  voiceRole: { enabled: boolean; roleId: string | null };
  canManageGuild: boolean;
}) {
  const fields = [
    {
      name: '個人自動進語音',
      value: options.autoJoinEnabled ? '已開啟' : '已關閉',
      inline: true
    },
    {
      name: '伺服器 TTS 倍速',
      value: getTtsSpeechRateLabel(options.speechRate),
      inline: true
    },
    {
      name: '語音身分組',
      value: options.voiceRole.roleId
        ? `${options.voiceRole.enabled ? '已開啟' : '已關閉'}，身分組：<@&${options.voiceRole.roleId}>`
        : '未設定身分組',
      inline: true
    }
  ];

  if (options.selectedSection === 'guild_voice_role') {
    fields.push({
      name: '目前設定項目',
      value: options.canManageGuild
        ? '選擇身分組後再開啟功能。機器人必須有「管理身分組」權限，且機器人的最高身分組必須高於目標身分組。'
        : '你可以查看目前設定，但需要「管理伺服器」權限才能調整這個設定。',
      inline: false
    });

    return {
      title: '設定面板',
      description: '使用下方選單切換要調整的項目。',
      fields,
      components: [
        buildSectionSelector(options.selectedSection),
        buildVoiceRoleToggleSelector(options.voiceRole.enabled, !options.canManageGuild || !options.voiceRole.roleId),
        buildVoiceRoleSelector(!options.canManageGuild)
      ]
    };
  }

  if (options.selectedSection === 'guild_speech_rate') {
    fields.push({
      name: '目前設定項目',
      value: options.canManageGuild
        ? `可直接選預設，或用「自訂輸入」設定 ${MIN_TTS_SPEECH_RATE}x 到 ${MAX_TTS_SPEECH_RATE}x。新訊息會套用新的倍速。`
        : '你可以查看目前倍速，但需要「管理伺服器」權限才能調整這個設定。',
      inline: false
    });

    return {
      title: '設定面板',
      description: '使用下方選單切換要調整的項目。',
      fields,
      components: [buildSectionSelector(options.selectedSection), buildSpeechRateSelector(options.speechRate, !options.canManageGuild)]
    };
  }

  fields.push({
    name: '目前設定項目',
    value: options.autoJoinEnabled
      ? '已開啟。當你已在語音頻道中，並在綁定打字頻道開始打字或發送訊息時，機器人會自動進入。'
      : '已關閉。你需要手動使用 `/join`，單純打字或發送訊息不會自動把機器人叫進來。',
    inline: false
  });
  fields.push({
    name: '生效條件',
    value: '伺服器必須先設定 `/settts`，你自己必須已在語音中，而且機器人不能已經鎖定在其他語音頻道。',
    inline: false
  });

  return {
    title: '設定面板',
    description: '使用下方選單切換要調整的項目。',
    fields,
    components: [buildSectionSelector(options.selectedSection), buildAutoJoinSelector(options.autoJoinEnabled)]
  };
}

function getCurrentConfigState(interaction: ConfigInteraction, context: BotContext, selectedSection: ConfigSection) {
  if (!interaction.guildId) {
    throw new Error('Config state requested outside of a guild.');
  }

  const guildId = interaction.guildId;

  return buildConfigReply({
    selectedSection,
    autoJoinEnabled: context.settingsStore.isAutoJoinEnabled(guildId, interaction.user.id),
    speechRate: context.settingsStore.getSpeechRate(guildId),
    voiceRole: context.settingsStore.getVoiceRoleSettings(guildId),
    canManageGuild: hasManageGuildPermission(interaction)
  });
}

function parseSelectedSpeechRate(value: string): TtsSpeechRate | null {
  if (!value.startsWith('preset:')) {
    return null;
  }

  return parseTtsSpeechRate(value.slice('preset:'.length));
}

export function isConfigSelect(customId: string): boolean {
  return (
    customId === CONFIG_PANEL_CUSTOM_ID ||
    customId === AUTO_JOIN_CUSTOM_ID ||
    customId === SPEECH_RATE_CUSTOM_ID ||
    customId === VOICE_ROLE_TOGGLE_CUSTOM_ID
  );
}

export function isConfigRoleSelect(customId: string): boolean {
  return customId === VOICE_ROLE_SELECT_CUSTOM_ID;
}

export function isConfigModal(customId: string): boolean {
  return customId === SPEECH_RATE_MODAL_CUSTOM_ID;
}

export async function handleConfigSelect(interaction: StringSelectMenuInteraction, context: BotContext): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEphemeral(interaction, '這個操作只能在伺服器內使用。');
    return;
  }

  if (interaction.customId === CONFIG_PANEL_CUSTOM_ID) {
    await updateEphemeralComponent(interaction, getCurrentConfigState(interaction, context, resolveConfigSection(interaction.values[0])));
    return;
  }

  if (interaction.customId === AUTO_JOIN_CUSTOM_ID) {
    const enabled = interaction.values[0] === 'on';
    context.settingsStore.setAutoJoinEnabled(interaction.guildId, interaction.user.id, enabled);

    await updateEphemeralComponent(interaction, getCurrentConfigState(interaction, context, 'personal_autojoin'));
    return;
  }

  if (interaction.customId === VOICE_ROLE_TOGGLE_CUSTOM_ID) {
    if (!hasManageGuildPermission(interaction)) {
      await replyEphemeral(interaction, '你需要「管理伺服器」權限才能調整這個設定。');
      return;
    }

    const enabled = interaction.values[0] === 'on';
    const voiceRole = context.settingsStore.getVoiceRoleSettings(interaction.guildId);

    if (enabled && !voiceRole.roleId) {
      await replyEphemeral(interaction, '請先選擇要自動給予的身分組。');
      return;
    }

    context.settingsStore.setVoiceRoleEnabled(interaction.guildId, enabled);
    await updateEphemeralComponent(interaction, getCurrentConfigState(interaction, context, 'guild_voice_role'));
    return;
  }

  if (!hasManageGuildPermission(interaction)) {
    await replyEphemeral(interaction, '你需要「管理伺服器」權限才能調整這個設定。');
    return;
  }

  const selectedValue = interaction.values[0];

  if (selectedValue === CUSTOM_SPEECH_RATE_VALUE) {
    await interaction.showModal(buildSpeechRateModal(context.settingsStore.getSpeechRate(interaction.guildId)));
    return;
  }

  const selectedSpeechRate = parseSelectedSpeechRate(selectedValue);

  if (selectedSpeechRate === null) {
    await replyEphemeral(interaction, '選到的倍速設定無效，請重新選擇。');
    return;
  }

  context.settingsStore.setSpeechRate(interaction.guildId, selectedSpeechRate);
  await updateEphemeralComponent(interaction, getCurrentConfigState(interaction, context, 'guild_speech_rate'));
}

export async function handleConfigRoleSelect(interaction: RoleSelectMenuInteraction, context: BotContext): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEphemeral(interaction, '這個操作只能在伺服器內使用。');
    return;
  }

  if (!hasManageGuildPermission(interaction)) {
    await replyEphemeral(interaction, '你需要「管理伺服器」權限才能調整這個設定。');
    return;
  }

  const selectedRoleId = interaction.values[0];

  if (!selectedRoleId) {
    await replyEphemeral(interaction, '請選擇一個身分組。');
    return;
  }

  context.settingsStore.setVoiceRoleId(interaction.guildId, selectedRoleId);
  await updateEphemeralComponent(interaction, getCurrentConfigState(interaction, context, 'guild_voice_role'));
}

export async function handleConfigModalSubmit(interaction: ModalSubmitInteraction, context: BotContext): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEphemeral(interaction, '這個操作只能在伺服器內使用。');
    return;
  }

  if (!hasManageGuildPermission(interaction)) {
    await replyEphemeral(interaction, '你需要「管理伺服器」權限才能調整這個設定。');
    return;
  }

  const submittedValue = interaction.fields.getTextInputValue(SPEECH_RATE_INPUT_CUSTOM_ID);
  const parsedSpeechRate = parseTtsSpeechRate(submittedValue);

  if (parsedSpeechRate === null) {
    await replyEphemeral(interaction, `請輸入 ${MIN_TTS_SPEECH_RATE} 到 ${MAX_TTS_SPEECH_RATE} 之間的數字，例如 1.25。`);
    return;
  }

  context.settingsStore.setSpeechRate(interaction.guildId, parsedSpeechRate);
  await replyEphemeral(interaction, getCurrentConfigState(interaction, context, 'guild_speech_rate'));
}

export const configCommand: CommandDefinition = {
  data: new SlashCommandBuilder().setName('config').setDescription('查看並調整個人與伺服器設定面板。'),
  async execute(interaction, context) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    await replyEphemeral(interaction, getCurrentConfigState(interaction, context, 'personal_autojoin'));
  }
};
