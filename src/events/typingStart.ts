import { ChannelType, type Typing } from 'discord.js';
import { maybeAutoJoinFromTextActivity } from '../core/autoJoin';
import { resolveMemberVoiceState } from '../core/memberVoice';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';

function canTypingTriggerAutoJoin(channel: Pick<Typing['channel'], 'id' | 'type'>, boundChannelId: string): boolean {
  return channel.id === boundChannelId || channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
}

export async function handleTypingStart(typing: Typing, context: BotContext): Promise<void> {
  if (!typing.inGuild() || typing.user.bot) {
    return;
  }

  context.queueManager.recordTextActivity(typing.guild.id, typing.channel.id);

  const boundChannelId = context.settingsStore.get(typing.guild.id);

  if (!boundChannelId) {
    return;
  }

  if (!context.settingsStore.isAutoJoinEnabled(typing.guild.id, typing.user.id)) {
    return;
  }

  if (!canTypingTriggerAutoJoin(typing.channel, boundChannelId)) {
    return;
  }

  const memberVoice = await resolveMemberVoiceState({
    guild: typing.guild,
    userId: typing.user.id,
    fallbackDisplayName: typing.user.displayName,
    logger: context.logger
  });

  await maybeAutoJoinFromTextActivity(
    {
      guildId: typing.guild.id,
      userId: typing.user.id,
      textChannelId: typing.channel.id,
      memberDisplayName: memberVoice.displayName,
      voiceChannel: memberVoice.voiceChannel
    },
    {
      settingsStore: context.settingsStore,
      queueManager: context.queueManager
    }
  );
}

export const typingStartEvent: EventDefinition<'typingStart'> = {
  name: 'typingStart',
  async execute(context, typing) {
    await handleTypingStart(typing, context);
  }
};
