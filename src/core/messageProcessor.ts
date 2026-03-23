import type { GuildSettingsStore } from './db';
import type { QueueManager } from './queue';
import type { VoiceChannelLike } from './queue';
import { sanitizeTtsInput } from './sanitize';

export interface TtsMessageInput {
  author: {
    bot: boolean;
  };
  webhookId: string | null;
  guildId: string | null;
  channelId: string;
  content: string;
  member: {
    displayName: string;
    voice: {
      channel: VoiceChannelLike | null;
    };
  } | null;
}

export async function processMessageForTts(
  message: TtsMessageInput,
  dependencies: {
    settingsStore: Pick<GuildSettingsStore, 'get' | 'getSpeechRate'>;
    queueManager: Pick<QueueManager, 'enqueue' | 'getState'>;
  }
): Promise<'ignored' | import('./queue').EnqueueStatus> {
  if (message.author.bot || message.webhookId || !message.guildId || !message.member) {
    return 'ignored';
  }

  const boundChannelId = dependencies.settingsStore.get(message.guildId);

  if (!boundChannelId || boundChannelId !== message.channelId) {
    return 'ignored';
  }

  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    return 'ignored';
  }

  const queueState = dependencies.queueManager.getState(message.guildId);

  if (!queueState) {
    return 'ignored';
  }

  const sanitizedContent = sanitizeTtsInput(message.content);

  if (!sanitizedContent) {
    return 'ignored';
  }

  const result = await dependencies.queueManager.enqueue({
    guildId: message.guildId,
    textChannelId: message.channelId,
    voiceChannelId: voiceChannel.id,
    memberDisplayName: message.member.displayName,
    content: sanitizedContent,
    speechRate: dependencies.settingsStore.getSpeechRate(message.guildId),
    voiceChannel
  });

  return result.status;
}
