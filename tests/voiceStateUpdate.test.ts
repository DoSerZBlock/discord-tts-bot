import { describe, expect, it, vi } from 'vitest';
import { handleVoiceStateUpdate } from '../src/events/voiceStateUpdate';

describe('handleVoiceStateUpdate', () => {
  it('disconnects the bot when no human members remain in the locked voice channel', async () => {
    const disconnectIfChannelEmpty = vi.fn();
    const context = {
      queueManager: {
        getState: () => ({
          lockedVoiceChannelId: 'voice-1'
        }),
        disconnectIfChannelEmpty,
      }
    };

    const lockedChannel = {
      members: new Map([
        [
          'bot-user',
          {
            user: {
              bot: true
            }
          }
        ]
      ])
    };

    const oldState = {
      guild: {
        id: 'guild-1',
        channels: {
          cache: new Map([['voice-1', lockedChannel]])
        }
      },
      channelId: 'voice-1'
    };

    const newState = {
      channelId: null
    };

    await handleVoiceStateUpdate(oldState as never, newState as never, context as never);

    expect(disconnectIfChannelEmpty).toHaveBeenCalledWith('guild-1', 0);
  });
});
