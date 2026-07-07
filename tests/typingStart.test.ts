import { ChannelType } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { handleTypingStart } from '../src/events/typingStart';

describe('handleTypingStart', () => {
  it('auto joins when an opted-in user types in the bound text channel while in voice', async () => {
    const connect = vi.fn(async () => ({ status: 'joined' as const }));
    const voiceChannel = {
      id: 'voice-1',
      guild: {
        id: 'guild-1',
        voiceAdapterCreator: {} as never
      }
    };
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
        connect
      }
    };

    const typing = {
      inGuild: () => true,
      user: {
        id: 'user-1',
        bot: false,
        displayName: 'Alice'
      },
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
      channel: {
        id: 'text-1',
        type: ChannelType.GuildText
      }
    };

    await handleTypingStart(typing as never, context as never);

    expect(fetchVoiceState).toHaveBeenCalledWith('user-1', { force: true });
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'text-1',
        voiceChannelId: 'voice-1',
        speechRate: 1.25
      })
    );
  });

  it('auto joins from cached voice state without fetching', async () => {
    const connect = vi.fn(async () => ({ status: 'joined' as const }));
    const voiceChannel = {
      id: 'voice-1',
      guild: {
        id: 'guild-1',
        voiceAdapterCreator: {} as never
      }
    };
    const fetchVoiceState = vi.fn();

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
        connect
      }
    };

    const typing = {
      inGuild: () => true,
      user: {
        id: 'user-1',
        bot: false,
        displayName: 'Alice'
      },
      guild: {
        id: 'guild-1',
        members: {
          cache: new Map([
            [
              'user-1',
              {
                displayName: 'Alice',
                voice: {
                  channel: voiceChannel
                }
              }
            ]
          ])
        },
        voiceStates: {
          cache: new Map(),
          fetch: fetchVoiceState
        }
      },
      channel: {
        id: 'text-1',
        type: ChannelType.GuildText
      }
    };

    await handleTypingStart(typing as never, context as never);

    expect(fetchVoiceState).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'text-1',
        voiceChannelId: 'voice-1',
        speechRate: 1.25
      })
    );
  });

  it('auto joins when an opted-in user types in their current voice channel chat', async () => {
    const connect = vi.fn(async () => ({ status: 'joined' as const }));
    const voiceChannel = {
      id: 'voice-1',
      guild: {
        id: 'guild-1',
        voiceAdapterCreator: {} as never
      }
    };
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
        connect
      }
    };

    const typing = {
      inGuild: () => true,
      user: {
        id: 'user-1',
        bot: false,
        displayName: 'Alice'
      },
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
      channel: {
        id: 'voice-1',
        type: ChannelType.GuildVoice
      }
    };

    await handleTypingStart(typing as never, context as never);

    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'voice-1',
        voiceChannelId: 'voice-1',
        speechRate: 1.25
      })
    );
  });
});
