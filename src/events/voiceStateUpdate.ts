import type { VoiceBasedChannel, VoiceState } from 'discord.js';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';

function isVoiceChannelWithMembers(channel: unknown): channel is VoiceBasedChannel {
  return typeof channel === 'object' && channel !== null && 'members' in channel;
}

async function assignVoiceRoleOnJoin(oldState: VoiceState, newState: VoiceState, context: BotContext): Promise<void> {
  if (oldState.channelId !== null || newState.channelId === null) {
    return;
  }

  const member = newState.member;

  if (!member || member.user.bot) {
    return;
  }

  const voiceRole = context.settingsStore.getVoiceRoleSettings(newState.guild.id);

  if (!voiceRole.enabled || !voiceRole.roleId || member.roles.cache.has(voiceRole.roleId)) {
    return;
  }

  try {
    await member.roles.add(voiceRole.roleId, 'Auto-assign voice role on voice channel join');
  } catch (error) {
    context.logger.warn(`Failed to assign voice role ${voiceRole.roleId} in guild ${newState.guild.id}`, error);
  }
}

async function removeVoiceRoleOnLeave(oldState: VoiceState, newState: VoiceState, context: BotContext): Promise<void> {
  if (oldState.channelId === null || newState.channelId !== null) {
    return;
  }

  const member = newState.member ?? oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const voiceRole = context.settingsStore.getVoiceRoleSettings(newState.guild.id);

  if (!voiceRole.enabled || !voiceRole.roleId || !member.roles.cache.has(voiceRole.roleId)) {
    return;
  }

  try {
    await member.roles.remove(voiceRole.roleId, 'Auto-remove voice role on voice channel leave');
  } catch (error) {
    context.logger.warn(`Failed to remove voice role ${voiceRole.roleId} in guild ${newState.guild.id}`, error);
  }
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, context: BotContext): Promise<void> {
  await assignVoiceRoleOnJoin(oldState, newState, context);
  await removeVoiceRoleOnLeave(oldState, newState, context);

  const guildId = newState.guild.id;
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
