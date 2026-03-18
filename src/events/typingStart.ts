import type { Typing } from 'discord.js';
import { maybeAutoJoinFromTextActivity } from '../core/autoJoin';
import type { BotContext } from '../types';
import type { EventDefinition } from './event';

export async function handleTypingStart(typing: Typing, context: BotContext): Promise<void> {
  if (!typing.inGuild() || typing.user.bot) {
    return;
  }

  context.queueManager.recordTextActivity(typing.guild.id, typing.channel.id);

  const boundChannelId = context.settingsStore.get(typing.guild.id);

  if (!boundChannelId || boundChannelId !== typing.channel.id) {
    return;
  }

  if (!context.settingsStore.isAutoJoinEnabled(typing.guild.id, typing.user.id)) {
    return;
  }

  const member = typing.guild.members.cache.get(typing.user.id) ?? (await typing.guild.members.fetch(typing.user.id));

  await maybeAutoJoinFromTextActivity(
    {
      guildId: typing.guild.id,
      userId: typing.user.id,
      textChannelId: typing.channel.id,
      memberDisplayName: member.displayName,
      voiceChannel: member.voice.channel
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
