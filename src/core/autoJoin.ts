import type { GuildSettingsStore } from './db';
import type { QueueManager, VoiceChannelLike } from './queue';

export async function maybeAutoJoinFromTextActivity(
  input: {
    guildId: string;
    userId: string;
    textChannelId: string;
    memberDisplayName: string;
    voiceChannel: VoiceChannelLike | null;
  },
  dependencies: {
    settingsStore: Pick<GuildSettingsStore, 'get' | 'getSpeechRate' | 'isAutoJoinEnabled'>;
    queueManager: Pick<QueueManager, 'connect'>;
  }
): Promise<boolean> {
  const boundChannelId = dependencies.settingsStore.get(input.guildId);

  if (!boundChannelId || boundChannelId !== input.textChannelId) {
    return false;
  }

  if (!dependencies.settingsStore.isAutoJoinEnabled(input.guildId, input.userId)) {
    return false;
  }

  if (!input.voiceChannel) {
    return false;
  }

  const result = await dependencies.queueManager.connect({
    guildId: input.guildId,
    textChannelId: input.textChannelId,
    voiceChannelId: input.voiceChannel.id,
    memberDisplayName: input.memberDisplayName,
    content: '',
    speechRate: dependencies.settingsStore.getSpeechRate(input.guildId),
    voiceChannel: input.voiceChannel
  });

  return result.status !== 'ignored_locked_to_other_channel';
}
