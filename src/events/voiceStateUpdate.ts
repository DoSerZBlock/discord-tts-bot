import type { VoiceBasedChannel, VoiceState } from 'discord.js';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';

function isVoiceChannelWithMembers(channel: unknown): channel is VoiceBasedChannel {
  return typeof channel === 'object' && channel !== null && 'members' in channel;
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, context: BotContext): Promise<void> {
  const guildId = oldState.guild.id;
  const queueState = context.queueManager.getState(guildId);

  if (!queueState) {
    return;
  }

  const lockedVoiceChannelId = queueState.lockedVoiceChannelId;

  if (oldState.channelId === lockedVoiceChannelId || newState.channelId === lockedVoiceChannelId) {
    const lockedChannel = oldState.guild.channels.cache.get(lockedVoiceChannelId);

    if (!isVoiceChannelWithMembers(lockedChannel)) {
      context.queueManager.disconnectIfChannelEmpty(guildId, 0);
    } else {
      const humanMemberCount = [...lockedChannel.members.values()].filter((member) => !member.user.bot).length;
      context.queueManager.disconnectIfChannelEmpty(guildId, humanMemberCount);
    }
  }

}

export const voiceStateUpdateEvent: EventDefinition<'voiceStateUpdate'> = {
  name: 'voiceStateUpdate',
  async execute(context, oldState, newState) {
    await handleVoiceStateUpdate(oldState, newState, context);
  }
};
