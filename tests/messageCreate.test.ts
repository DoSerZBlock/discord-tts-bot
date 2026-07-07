import { ChannelType } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import type { VoiceChannelLike } from '../src/core/queue';
import { handleMessageCreate } from '../src/events/messageCreate';

function createVoiceChannel(id = 'voice-1'): VoiceChannelLike {
  return {
    id,
    guild: {
      id: 'guild-1',
      voiceAdapterCreator: {} as never
    }
  };
}

function createMentions() {
  return {
    users: new Map(),
    members: new Map(),
    roles: new Map(),
    channels: new Map()
  };
}

describe('handleMessageCreate', () => {
  it('auto joins and enqueues when the message member is missing but voice state can be fetched', async () => {
    const voiceChannel = createVoiceChannel();
    let connected = false;
    const connect = vi.fn(async () => {
      connected = true;
      return { status: 'joined' as const };
    });
    const enqueue = vi.fn(async () => ({ status: 'started' as const }));
    const fetchVoiceState = vi.fn(async () => ({
      member: {
        displayName: 'Alice'
      },
      channel: voiceChannel
    }));

    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        get: () => 'text-1',
        getSpeechRate: () => 1.25,
        isAutoJoinEnabled: () => true
      },
      queueManager: {
        recordTextActivity: vi.fn(),
        connect,
        enqueue,
        getState: () => (connected ? { lockedVoiceChannelId: 'voice-1' } : null)
      }
    };

    const message = {
      inGuild: () => true,
      guildId: 'guild-1',
      channelId: 'text-1',
      channel: {
        type: ChannelType.GuildText
      },
      content: 'hello from text',
      author: {
        id: 'user-1',
        bot: false,
        displayName: 'Alice'
      },
      webhookId: null,
      member: null,
      guild: {
        id: 'guild-1',
        members: {
          cache: new Map()
        },
        voiceStates: {
          cache: new Map(),
          fetch: fetchVoiceState
        }
      },
      mentions: createMentions()
    };

    await handleMessageCreate(message as never, context as never);

    expect(fetchVoiceState).toHaveBeenCalledWith('user-1', { force: true });
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'text-1',
        voiceChannelId: 'voice-1',
        memberDisplayName: 'Alice'
      })
    );
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'text-1',
        voiceChannelId: 'voice-1',
        memberDisplayName: 'Alice',
        content: 'hello from text',
        speechRate: 1.25
      })
    );
  });

  it('auto joins and enqueues from the current voice channel chat', async () => {
    const voiceChannel = createVoiceChannel();
    let connected = false;
    const connect = vi.fn(async () => {
      connected = true;
      return { status: 'joined' as const };
    });
    const enqueue = vi.fn(async () => ({ status: 'started' as const }));
    const fetchVoiceState = vi.fn(async () => ({
      member: {
        displayName: 'Alice'
      },
      channel: voiceChannel
    }));

    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        get: () => 'text-1',
        getSpeechRate: () => 1.25,
        isAutoJoinEnabled: () => true
      },
      queueManager: {
        recordTextActivity: vi.fn(),
        connect,
        enqueue,
        getState: () => (connected ? { lockedVoiceChannelId: 'voice-1' } : null)
      }
    };

    const message = {
      inGuild: () => true,
      guildId: 'guild-1',
      channelId: 'voice-1',
      channel: {
        type: ChannelType.GuildVoice
      },
      content: 'hello from voice chat',
      author: {
        id: 'user-1',
        bot: false,
        displayName: 'Alice'
      },
      webhookId: null,
      member: null,
      guild: {
        id: 'guild-1',
        members: {
          cache: new Map()
        },
        voiceStates: {
          cache: new Map(),
          fetch: fetchVoiceState
        }
      },
      mentions: createMentions()
    };

    await handleMessageCreate(message as never, context as never);

    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'voice-1',
        voiceChannelId: 'voice-1',
        memberDisplayName: 'Alice'
      })
    );
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'voice-1',
        voiceChannelId: 'voice-1',
        memberDisplayName: 'Alice',
        content: 'hello from voice chat',
        speechRate: 1.25
      })
    );
  });
});
