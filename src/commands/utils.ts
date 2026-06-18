import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import type {
  APIEmbedField,
  ButtonInteraction,
  ChatInputCommandInteraction,
  GuildMember,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction
} from 'discord.js';

type MessageComponentBuilder = ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder;
type RepliableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | RoleSelectMenuInteraction
  | ModalSubmitInteraction;

interface EmbedReplyOptions {
  title?: string;
  description: string;
  fields?: APIEmbedField[];
  components?: Array<ActionRowBuilder<MessageComponentBuilder>>;
}

const DEFAULT_EMBED_COLOR = 0x5865f2;
const ERROR_EMBED_COLOR = 0xed4245;

export function createInfoEmbed(options: EmbedReplyOptions): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(DEFAULT_EMBED_COLOR).setDescription(options.description).setTimestamp();

  if (options.title) {
    embed.setTitle(options.title);
  }

  if (options.fields && options.fields.length > 0) {
    embed.addFields(options.fields);
  }

  return embed;
}

export function createErrorEmbed(description: string, title = '發生錯誤'): EmbedBuilder {
  return new EmbedBuilder().setColor(ERROR_EMBED_COLOR).setTitle(title).setDescription(description).setTimestamp();
}

function buildPayload(options: EmbedReplyOptions, ephemeral: boolean) {
  return {
    embeds: [createInfoEmbed(options)],
    components: options.components ?? [],
    flags: ephemeral ? MessageFlags.Ephemeral : undefined
  } as const;
}

export async function replyEphemeral(
  interaction: RepliableInteraction,
  content: string | EmbedReplyOptions
): Promise<void> {
  const options = typeof content === 'string' ? { description: content } : content;
  const payload = buildPayload(options, true);

  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply({
      embeds: payload.embeds,
      components: payload.components
    });
    return;
  }

  if (interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

export async function updateEphemeralComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction | RoleSelectMenuInteraction,
  content: string | EmbedReplyOptions
): Promise<void> {
  const options = typeof content === 'string' ? { description: content } : content;
  const payload = buildPayload(options, true);

  await interaction.update({
    embeds: payload.embeds,
    components: payload.components
  });
}

export async function fetchInteractionMember(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | RoleSelectMenuInteraction
    | ModalSubmitInteraction
): Promise<GuildMember | null> {
  if (!interaction.inGuild() || !interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id);
}
