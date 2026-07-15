import { inlineCode, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
  MAX_IGNORED_PREFIXES_PER_GUILD,
  MAX_IGNORED_PREFIX_LENGTH,
  validateIgnoredPrefix
} from '../core/ignoredPrefixes';
import type { BotContext } from '../types';
import type { CommandDefinition } from './command';
import { replyEphemeral } from './utils';

function formatPrefixes(prefixes: readonly string[]): string {
  if (prefixes.length === 0) {
    return '目前沒有設定任何忽略前綴。';
  }

  return prefixes.map((prefix) => inlineCode(prefix)).join('、');
}

function ensureManageGuildPermission(
  interaction: Parameters<CommandDefinition['execute']>[0]
): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

function getValidatedPrefix(
  interaction: Parameters<CommandDefinition['execute']>[0],
  optionName: string
): { prefix: string } | { error: string } {
  const result = validateIgnoredPrefix(interaction.options.getString(optionName, true));

  if (!result.valid) {
    return { error: result.error ?? '前綴格式無效。' };
  }

  return { prefix: result.prefix };
}

export const prefixCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('管理這個伺服器不會被 TTS 朗讀的訊息前綴。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('新增一個忽略前綴。')
        .addStringOption((option) =>
          option
            .setName('prefix')
            .setDescription('例如 !、?、;;')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(MAX_IGNORED_PREFIX_LENGTH)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('list').setDescription('列出目前所有忽略前綴。'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('update')
        .setDescription('替換一個既有的忽略前綴。')
        .addStringOption((option) =>
          option
            .setName('current')
            .setDescription('目前的前綴')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(MAX_IGNORED_PREFIX_LENGTH)
        )
        .addStringOption((option) =>
          option
            .setName('replacement')
            .setDescription('要替換成的新前綴')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(MAX_IGNORED_PREFIX_LENGTH)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('移除一個忽略前綴。')
        .addStringOption((option) =>
          option
            .setName('prefix')
            .setDescription('要移除的前綴')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(MAX_IGNORED_PREFIX_LENGTH)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('clear').setDescription('清除所有忽略前綴。')),
  async execute(interaction, context: BotContext) {
    if (!interaction.inGuild()) {
      await replyEphemeral(interaction, '這個指令只能在伺服器內使用。');
      return;
    }

    if (!ensureManageGuildPermission(interaction)) {
      await replyEphemeral(interaction, '你需要「管理伺服器」權限才能調整忽略前綴。');
      return;
    }

    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const prefixes = context.settingsStore.getIgnoredPrefixes(guildId);
      await replyEphemeral(interaction, {
        title: '忽略前綴',
        description: formatPrefixes(prefixes),
        fields: [
          {
            name: '比對方式',
            value: '訊息忽略開頭空白後，只要以任一前綴開頭，就不會觸發自動加入或 TTS 朗讀。'
          },
          {
            name: '使用量',
            value: `${prefixes.length} / ${MAX_IGNORED_PREFIXES_PER_GUILD}`,
            inline: true
          }
        ]
      });
      return;
    }

    if (subcommand === 'clear') {
      const removedCount = context.settingsStore.clearIgnoredPrefixes(guildId);
      await replyEphemeral(
        interaction,
        removedCount > 0 ? `已清除 ${removedCount} 個忽略前綴。` : '目前沒有可清除的忽略前綴。'
      );
      return;
    }

    if (subcommand === 'add') {
      const validated = getValidatedPrefix(interaction, 'prefix');

      if ('error' in validated) {
        await replyEphemeral(interaction, validated.error);
        return;
      }

      const prefixes = context.settingsStore.getIgnoredPrefixes(guildId);

      if (prefixes.includes(validated.prefix)) {
        await replyEphemeral(interaction, `${inlineCode(validated.prefix)} 已經在忽略清單中。`);
        return;
      }

      if (prefixes.length >= MAX_IGNORED_PREFIXES_PER_GUILD) {
        await replyEphemeral(interaction, `每個伺服器最多只能設定 ${MAX_IGNORED_PREFIXES_PER_GUILD} 個忽略前綴。`);
        return;
      }

      context.settingsStore.addIgnoredPrefix(guildId, validated.prefix);
      await replyEphemeral(interaction, `已新增忽略前綴 ${inlineCode(validated.prefix)}。`);
      return;
    }

    if (subcommand === 'remove') {
      const validated = getValidatedPrefix(interaction, 'prefix');

      if ('error' in validated) {
        await replyEphemeral(interaction, validated.error);
        return;
      }

      const removed = context.settingsStore.removeIgnoredPrefix(guildId, validated.prefix);
      await replyEphemeral(
        interaction,
        removed
          ? `已移除忽略前綴 ${inlineCode(validated.prefix)}。`
          : `找不到忽略前綴 ${inlineCode(validated.prefix)}。`
      );
      return;
    }

    const current = getValidatedPrefix(interaction, 'current');
    const replacement = getValidatedPrefix(interaction, 'replacement');

    if ('error' in current) {
      await replyEphemeral(interaction, current.error);
      return;
    }

    if ('error' in replacement) {
      await replyEphemeral(interaction, replacement.error);
      return;
    }

    const result = context.settingsStore.replaceIgnoredPrefix(guildId, current.prefix, replacement.prefix);

    if (result === 'not_found') {
      await replyEphemeral(interaction, `找不到忽略前綴 ${inlineCode(current.prefix)}。`);
      return;
    }

    if (result === 'duplicate') {
      await replyEphemeral(interaction, `${inlineCode(replacement.prefix)} 已經在忽略清單中。`);
      return;
    }

    if (result === 'unchanged') {
      await replyEphemeral(interaction, '新舊前綴相同，設定未變更。');
      return;
    }

    await replyEphemeral(
      interaction,
      `已將忽略前綴 ${inlineCode(current.prefix)} 更新為 ${inlineCode(replacement.prefix)}。`
    );
  }
};
