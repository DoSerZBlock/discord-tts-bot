import { describe, expect, it, vi } from 'vitest';
import { handleTypingStart } from '../src/events/typingStart';

describe('handleTypingStart', () => {
  it('auto joins when an opted-in user types in the bound text channel while in voice', async () => {
    const connect = vi.fn(async () => ({ status: 'joined' as const }));
    const fetch = vi.fn(async () => ({
      displayName: 'Alice',
      voice: {
        channel: {
          id: 'voice-1',
          guild: {
            id: 'guild-1',
            voiceAdapterCreator: {} as never
          }
        }
      }
    }));

    const context = {
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
        bot: false
      },
      guild: {
        id: 'guild-1',
        members: {
          cache: new Map(),
          fetch
        }
      },
      channel: {
        id: 'text-1'
      }
    };

    await handleTypingStart(typing as never, context as never);

    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'guild-1',
        textChannelId: 'text-1',
        voiceChannelId: 'voice-1',
        speechRate: 1.25
      })
    );
  });
});
