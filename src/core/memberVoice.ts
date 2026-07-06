import type { Guild, GuildMember } from 'discord.js';
import type { Logger } from '../logger';
import type { VoiceChannelLike } from './queue';

const UNKNOWN_VOICE_STATE_ERROR_CODE = 10065;

export interface ResolvedMemberVoiceState {
  displayName: string;
  voiceChannel: VoiceChannelLike | null;
}

function getErrorCode(error: unknown): unknown {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return (error as { code: unknown }).code;
}

export async function resolveMemberVoiceState(options: {
  guild: Guild;
  userId: string;
  fallbackDisplayName: string;
  member?: GuildMember | null;
  logger?: Pick<Logger, 'warn'>;
}): Promise<ResolvedMemberVoiceState> {
  const cachedMember = options.member ?? options.guild.members.cache.get(options.userId) ?? null;
  const cachedVoiceChannel = cachedMember?.voice.channel ?? options.guild.voiceStates.cache.get(options.userId)?.channel ?? null;

  if (cachedVoiceChannel) {
    return {
      displayName: cachedMember?.displayName ?? options.fallbackDisplayName,
      voiceChannel: cachedVoiceChannel
    };
  }

  try {
    const voiceState = await options.guild.voiceStates.fetch(options.userId, { force: true });

    return {
      displayName: voiceState.member?.displayName ?? cachedMember?.displayName ?? options.fallbackDisplayName,
      voiceChannel: voiceState.channel
    };
  } catch (error) {
    if (getErrorCode(error) !== UNKNOWN_VOICE_STATE_ERROR_CODE) {
      options.logger?.warn(`Failed to fetch voice state for user ${options.userId} in guild ${options.guild.id}.`, error);
    }
  }

  return {
    displayName: cachedMember?.displayName ?? options.fallbackDisplayName,
    voiceChannel: null
  };
}
