import { describe, expect, it, vi } from 'vitest';
import { processMessageForTts } from '../src/core/messageProcessor';
import type { VoiceChannelLike } from '../src/core/queue';

function createVoiceChannel(id = 'voice-1'): VoiceChannelLike {
  return {
    id,
    guild: {
      id: 'guild-1',
      voiceAdapterCreator: {} as never
    }
  };
}

describe('processMessageForTts', () => {
  it('ignores messages outside the bound channel', async () => {
    const enqueue = vi.fn();

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'text-2',
          content: 'hello',
          member: {
            displayName: 'Alice',
            voice: { channel: createVoiceChannel() }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1
          },
          queueManager: {
            enqueue,
            getState: () => null
          }
        } as never
      )
    ).resolves.toBe('ignored');

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('ignores messages from users not in voice', async () => {
    const enqueue = vi.fn();

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'text-1',
          content: 'hello',
          member: {
            displayName: 'Alice',
            voice: { channel: null }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1
          },
          queueManager: {
            enqueue,
            getState: () => null
          }
        } as never
      )
    ).resolves.toBe('ignored');
  });

  it('ignores messages when the bot has not joined voice yet', async () => {
    const enqueue = vi.fn();

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'text-1',
          content: 'hello',
          member: {
            displayName: 'Alice',
            voice: { channel: createVoiceChannel() }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1
          },
          queueManager: {
            enqueue,
            getState: () => null
          }
        } as never
      )
    ).resolves.toBe('ignored');

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues messages from the locked voice channel chat', async () => {
    const enqueue = vi.fn(async () => ({ status: 'started' as const }));

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'voice-1',
          content: 'hello from voice chat',
          member: {
            displayName: 'Alice',
            voice: { channel: createVoiceChannel('voice-1') }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1.25
          },
          queueManager: {
            enqueue,
            getState: () => ({
              lockedVoiceChannelId: 'voice-1'
            })
          }
        } as never
      )
    ).resolves.toBe('started');

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        textChannelId: 'voice-1',
        voiceChannelId: 'voice-1',
        content: 'hello from voice chat',
        speechRate: 1.25
      })
    );
  });

  it('ignores messages from a different voice channel chat', async () => {
    const enqueue = vi.fn();

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'voice-2',
          content: 'hello from another voice chat',
          member: {
            displayName: 'Alice',
            voice: { channel: createVoiceChannel('voice-2') }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1
          },
          queueManager: {
            enqueue,
            getState: () => ({
              lockedVoiceChannelId: 'voice-1'
            })
          }
        } as never
      )
    ).resolves.toBe('ignored');

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('sanitizes content before enqueueing', async () => {
    const enqueue = vi.fn(async () => ({ status: 'started' as const }));

    await expect(
      processMessageForTts(
        {
          author: { bot: false },
          webhookId: null,
          guildId: 'guild-1',
          channelId: 'text-1',
          content: 'hello   \n world',
          member: {
            displayName: 'Alice',
            voice: { channel: createVoiceChannel() }
          }
        },
        {
          settingsStore: {
            get: () => 'text-1',
            getSpeechRate: () => 1.25
          },
          queueManager: {
            enqueue,
            getState: () => ({
              lockedVoiceChannelId: 'voice-1'
            })
          }
        } as never
      )
    ).resolves.toBe('started');

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hello world',
        speechRate: 1.25
      })
    );
  });
});
