import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  QueueManager,
  VOICE_SESSION_INACTIVITY_MS,
  type EnqueuePayload,
  type VoiceChannelLike
} from '../src/core/queue';
import type { Logger } from '../src/logger';

class FakePlayer {
  public playedResources: string[] = [];
  public stopCalls = 0;

  public constructor(
    private readonly handlers: {
      onIdle: () => void;
      onError: (error: Error) => void;
    }
  ) {}

  public play(resource: unknown): void {
    this.playedResources.push(String(resource));
  }

  public stop(): boolean {
    this.stopCalls += 1;
    this.handlers.onIdle();
    return true;
  }

  public triggerIdle(): void {
    this.handlers.onIdle();
  }
}

class FakeConnection {
  public destroyed = false;

  public destroy(): void {
    this.destroyed = true;
  }
}

class FakeVoiceRuntime {
  public player: FakePlayer | null = null;
  public connection = new FakeConnection();
  public subscribeCalls = 0;

  public createPlayer(handlers: { onIdle: () => void; onError: (error: Error) => void }): FakePlayer {
    this.player = new FakePlayer(handlers);
    return this.player;
  }

  public async join(): Promise<FakeConnection> {
    return this.connection;
  }

  public subscribe(): void {
    this.subscribeCalls += 1;
  }

  public destroy(connection: FakeConnection): void {
    connection.destroy();
  }
}

function createPayload(overrides: Partial<EnqueuePayload> = {}): EnqueuePayload {
  const voiceChannel = {
    id: 'voice-1',
    guild: {
      id: 'guild-1',
      voiceAdapterCreator: {} as never
    }
  } satisfies VoiceChannelLike;

  return {
    guildId: 'guild-1',
    textChannelId: 'text-1',
    voiceChannelId: 'voice-1',
    memberDisplayName: 'Alice',
    content: 'hello world',
    voiceChannel,
    ...overrides
  };
}

const silentLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('QueueManager', () => {
  it('connects to a voice channel without starting playback', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await expect(queueManager.connect(createPayload())).resolves.toEqual({ status: 'joined' });
    expect(queueManager.getState('guild-1')?.isPlaying).toBe(false);
    expect(voiceRuntime.connection.destroyed).toBe(false);
  });

  it('keeps the voice session after the queue becomes idle', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await expect(queueManager.enqueue(createPayload())).resolves.toEqual({ status: 'started' });

    await vi.waitFor(() => {
      expect(voiceRuntime.player?.playedResources).toEqual(['resource:hello world']);
    });

    voiceRuntime.player?.triggerIdle();

    await vi.waitFor(() => {
      expect(queueManager.getState('guild-1')).not.toBeNull();
      expect(queueManager.getState('guild-1')?.isPlaying).toBe(false);
    });

    expect(voiceRuntime.connection.destroyed).toBe(false);
  });

  it('starts playback for the first item and queues the next item', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await expect(queueManager.enqueue(createPayload())).resolves.toEqual({ status: 'started' });
    await expect(
      queueManager.enqueue(
        createPayload({
          content: 'second item',
          memberDisplayName: 'Bob'
        })
      )
    ).resolves.toEqual({ status: 'enqueued' });

    await vi.waitFor(() => {
      expect(voiceRuntime.player?.playedResources).toEqual(['resource:hello world']);
    });

    voiceRuntime.player?.triggerIdle();

    await vi.waitFor(() => {
      expect(voiceRuntime.player?.playedResources).toEqual(['resource:hello world', 'resource:second item']);
    });
  });

  it('ignores enqueue requests from another locked voice channel', async () => {
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime: new FakeVoiceRuntime()
    });

    await queueManager.enqueue(createPayload());

    await expect(
      queueManager.enqueue(
        createPayload({
          voiceChannelId: 'voice-2',
          voiceChannel: {
            id: 'voice-2',
            guild: {
              id: 'guild-1',
              voiceAdapterCreator: {} as never
            }
          }
        })
      )
    ).resolves.toEqual({ status: 'ignored_locked_to_other_channel' });
  });

  it('returns already connected when connect is called for the same voice channel', async () => {
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime: new FakeVoiceRuntime()
    });

    await queueManager.connect(createPayload());

    await expect(queueManager.connect(createPayload())).resolves.toEqual({ status: 'already_connected' });
  });

  it('stops and tears down the voice session', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await queueManager.enqueue(createPayload());

    await vi.waitFor(() => {
      expect(queueManager.getState('guild-1')).not.toBeNull();
    });

    expect(queueManager.stop('guild-1')).toBe('stopped');
    expect(queueManager.getState('guild-1')).toBeNull();
    expect(voiceRuntime.connection.destroyed).toBe(true);
  });

  it('skips to the next queued item', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await queueManager.enqueue(createPayload());
    await queueManager.enqueue(createPayload({ content: 'next item' }));

    await vi.waitFor(() => {
      expect(queueManager.getState('guild-1')?.currentItem?.content).toBe('hello world');
    });

    expect(queueManager.skip('guild-1')).toBe('skipped');

    await vi.waitFor(() => {
      expect(queueManager.getState('guild-1')?.currentItem?.content).toBe('next item');
    });
  });

  it('disconnects after 3 hours without bound text-channel activity', async () => {
    vi.useFakeTimers();

    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await queueManager.enqueue(createPayload());

    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(VOICE_SESSION_INACTIVITY_MS);

    expect(queueManager.getState('guild-1')).toBeNull();
    expect(voiceRuntime.connection.destroyed).toBe(true);
  });

  it('resets the inactivity timer when the bound text channel has activity', async () => {
    vi.useFakeTimers();

    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await queueManager.enqueue(createPayload());

    vi.advanceTimersByTime(VOICE_SESSION_INACTIVITY_MS - 1_000);
    expect(queueManager.recordTextActivity('guild-1', 'text-1')).toBe(true);

    vi.advanceTimersByTime(2_000);
    expect(queueManager.getState('guild-1')).not.toBeNull();

    vi.advanceTimersByTime(VOICE_SESSION_INACTIVITY_MS);
    expect(queueManager.getState('guild-1')).toBeNull();
  });

  it('disconnects when the voice channel no longer has human members', async () => {
    const voiceRuntime = new FakeVoiceRuntime();
    const queueManager = new QueueManager({
      logger: silentLogger,
      ttsService: {
        createAudioResource: vi.fn(async (text: string) => `resource:${text}`)
      },
      voiceRuntime
    });

    await queueManager.enqueue(createPayload());

    expect(queueManager.disconnectIfChannelEmpty('guild-1', 0)).toBe(true);
    expect(queueManager.getState('guild-1')).toBeNull();
    expect(voiceRuntime.connection.destroyed).toBe(true);
  });
});
