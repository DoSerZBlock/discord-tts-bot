import { describe, expect, it, vi } from 'vitest';
import { handleVoiceStateUpdate } from '../src/events/voiceStateUpdate';

describe('handleVoiceStateUpdate', () => {
  it('disconnects the bot when no human members remain in the locked voice channel', async () => {
    const disconnectIfChannelEmpty = vi.fn();
    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        getVoiceRoleSettings: () => ({ enabled: false, roleId: null })
      },
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
      guild: oldState.guild,
      channelId: null
    };

    await handleVoiceStateUpdate(oldState as never, newState as never, context as never);

    expect(disconnectIfChannelEmpty).toHaveBeenCalledWith('guild-1', 0);
  });

  it('assigns the configured voice role when a human member joins any voice channel', async () => {
    const addRole = vi.fn();
    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        getVoiceRoleSettings: () => ({ enabled: true, roleId: 'role-1' })
      },
      queueManager: {
        getState: () => null
      }
    };

    const guild = {
      id: 'guild-1'
    };
    const oldState = {
      guild,
      channelId: null
    };
    const newState = {
      guild,
      channelId: 'voice-1',
      member: {
        user: {
          bot: false
        },
        roles: {
          cache: new Map(),
          add: addRole
        }
      }
    };

    await handleVoiceStateUpdate(oldState as never, newState as never, context as never);

    expect(addRole).toHaveBeenCalledWith('role-1', 'Auto-assign voice role on voice channel join');
  });

  it('removes the configured voice role when a human member leaves voice entirely', async () => {
    const removeRole = vi.fn();
    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        getVoiceRoleSettings: () => ({ enabled: true, roleId: 'role-1' })
      },
      queueManager: {
        getState: () => null
      }
    };

    const guild = {
      id: 'guild-1'
    };
    const member = {
      user: {
        bot: false
      },
      roles: {
        cache: new Map([['role-1', {}]]),
        remove: removeRole
      }
    };
    const oldState = {
      guild,
      channelId: 'voice-1',
      member
    };
    const newState = {
      guild,
      channelId: null,
      member
    };

    await handleVoiceStateUpdate(oldState as never, newState as never, context as never);

    expect(removeRole).toHaveBeenCalledWith('role-1', 'Auto-remove voice role on voice channel leave');
  });

  it('does not remove the configured voice role when a human member moves between voice channels', async () => {
    const removeRole = vi.fn();
    const context = {
      logger: {
        warn: vi.fn()
      },
      settingsStore: {
        getVoiceRoleSettings: () => ({ enabled: true, roleId: 'role-1' })
      },
      queueManager: {
        getState: () => null
      }
    };

    const guild = {
      id: 'guild-1'
    };
    const member = {
      user: {
        bot: false
      },
      roles: {
        cache: new Map([['role-1', {}]]),
        remove: removeRole
      }
    };
    const oldState = {
      guild,
      channelId: 'voice-1',
      member
    };
    const newState = {
      guild,
      channelId: 'voice-2',
      member
    };

    await handleVoiceStateUpdate(oldState as never, newState as never, context as never);

    expect(removeRole).not.toHaveBeenCalled();
  });
});
