import { ChannelType, type Message } from 'discord.js';
import { maybeAutoJoinFromTextActivity } from '../core/autoJoin';
import { startsWithIgnoredPrefix } from '../core/ignoredPrefixes';
import { resolveMemberVoiceState, type ResolvedMemberVoiceState } from '../core/memberVoice';
import { processMessageForTts } from '../core/messageProcessor';
import { replaceMentionsForTts } from '../core/ttsContent';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';

function resolveTtsContent(message: Message): string {
  const userDisplayNames = new Map<string, string>();
  const roleNames = new Map<string, string>();
  const channelNames = new Map<string, string>();

  for (const [userId, user] of message.mentions.users) {
    userDisplayNames.set(userId, message.mentions.members?.get(userId)?.displayName ?? user.displayName);
  }

  for (const [roleId, role] of message.mentions.roles) {
    roleNames.set(roleId, role.name);
  }

  for (const [channelId, channel] of message.mentions.channels) {
    channelNames.set(channelId, 'name' in channel ? channel.name ?? '某個頻道' : '某個頻道');
  }

  return replaceMentionsForTts(message.content, {
    users: userDisplayNames,
    roles: roleNames,
    channels: channelNames
  });
}

function shouldResolveMemberVoice(message: Message<true>, context: BotContext): boolean {
  if (message.author.bot || message.webhookId) {
    return false;
  }

  const boundChannelId = context.settingsStore.get(message.guildId);
  const queueState = context.queueManager.getState(message.guildId);
  const isBoundTextChannel = boundChannelId === message.channelId;
  const isLockedVoiceChannelChat = queueState?.lockedVoiceChannelId === message.channelId;
  const isVoiceChannelChat = message.channel.type === ChannelType.GuildVoice || message.channel.type === ChannelType.GuildStageVoice;

  if ((isBoundTextChannel || isVoiceChannelChat) && context.settingsStore.isAutoJoinEnabled(message.guildId, message.author.id)) {
    return true;
  }

  return queueState !== null && (isBoundTextChannel || isLockedVoiceChannelChat);
}

function createProcessMember(message: Message<true>, memberVoice: ResolvedMemberVoiceState | null) {
  if (memberVoice) {
    return {
      displayName: memberVoice.displayName,
      voice: {
        channel: memberVoice.voiceChannel
      }
    };
  }

  if (!message.member) {
    return null;
  }

  return {
    displayName: message.member.displayName,
    voice: {
      channel: message.member.voice.channel
    }
  };
}

export async function handleMessageCreate(message: Message, context: BotContext): Promise<void> {
  if (!message.inGuild()) {
    return;
  }

  if (message.author.bot || message.webhookId) {
    return;
  }

  const ignoredPrefixes = context.settingsStore.getIgnoredPrefixes(message.guildId);

  if (startsWithIgnoredPrefix(message.content, ignoredPrefixes)) {
    return;
  }

  const memberVoice = shouldResolveMemberVoice(message, context)
    ? await resolveMemberVoiceState({
        guild: message.guild,
        userId: message.author.id,
        fallbackDisplayName: message.member?.displayName ?? message.author.displayName,
        member: message.member,
        logger: context.logger
      })
    : null;

  context.queueManager.recordTextActivity(message.guildId, message.channelId);

  await maybeAutoJoinFromTextActivity(
    {
      guildId: message.guildId,
      userId: message.author.id,
      textChannelId: message.channelId,
      memberDisplayName: memberVoice?.displayName ?? message.member?.displayName ?? message.author.displayName,
      voiceChannel: memberVoice?.voiceChannel ?? message.member?.voice.channel ?? null
    },
    {
      settingsStore: context.settingsStore,
      queueManager: context.queueManager
    }
  );

  await processMessageForTts(
    {
      author: {
        bot: message.author.bot
      },
      webhookId: message.webhookId,
      guildId: message.guildId,
      channelId: message.channelId,
      content: resolveTtsContent(message),
      member: createProcessMember(message, memberVoice)
    },
    {
      settingsStore: context.settingsStore,
      queueManager: context.queueManager
    }
  );
}

export const messageCreateEvent: EventDefinition<'messageCreate'> = {
  name: 'messageCreate',
  async execute(context, message) {
    await handleMessageCreate(message, context);
  }
};
