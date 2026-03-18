import type { Message } from 'discord.js';
import { maybeAutoJoinFromTextActivity } from '../core/autoJoin';
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

export async function handleMessageCreate(message: Message, context: BotContext): Promise<void> {
  if (!message.inGuild()) {
    return;
  }

  if (!message.author.bot && !message.webhookId) {
    context.queueManager.recordTextActivity(message.guildId, message.channelId);

    await maybeAutoJoinFromTextActivity(
      {
        guildId: message.guildId,
        userId: message.author.id,
        textChannelId: message.channelId,
        memberDisplayName: message.member?.displayName ?? message.author.displayName,
        voiceChannel: message.member?.voice.channel ?? null
      },
      {
        settingsStore: context.settingsStore,
        queueManager: context.queueManager
      }
    );
  }

  await processMessageForTts(
    {
      author: {
        bot: message.author.bot
      },
      webhookId: message.webhookId,
      guildId: message.guildId,
      channelId: message.channelId,
      content: resolveTtsContent(message),
      member: message.member
        ? {
            displayName: message.member.displayName,
            voice: {
              channel: message.member.voice.channel
            }
          }
        : null
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
