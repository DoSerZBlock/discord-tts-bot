import {
  AudioPlayerStatus,
  DiscordGatewayAdapterCreator,
  VoiceConnectionStatus,
  createAudioPlayer,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import type { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import type { Logger } from '../logger';
import type { TtsService } from './tts';

export const VOICE_SESSION_INACTIVITY_MS = 3 * 60 * 60 * 1000;

export interface VoiceChannelLike {
  id: string;
  guild: {
    id: string;
    voiceAdapterCreator: DiscordGatewayAdapterCreator;
  };
}

interface AudioPlayerLike {
  play(resource: unknown): void;
  stop(force?: boolean): boolean;
}

interface VoiceConnectionLike {
  destroy(): void;
}

interface VoiceRuntime {
  createPlayer(handlers: QueuePlayerHandlers): AudioPlayerLike;
  join(channel: VoiceChannelLike): Promise<VoiceConnectionLike>;
  subscribe(connection: VoiceConnectionLike, player: AudioPlayerLike): void;
  destroy(connection: VoiceConnectionLike): void;
}

interface QueuePlayerHandlers {
  onIdle: () => void;
  onError: (error: Error) => void;
}

interface QueueItem {
  textChannelId: string;
  memberDisplayName: string;
  content: string;
}

interface ServerQueue {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  connection: VoiceConnectionLike;
  player: AudioPlayerLike;
  items: QueueItem[];
  currentItem: QueueItem | null;
  isAdvancing: boolean;
  lastTextActivityAt: number;
  inactivityTimer: NodeJS.Timeout | null;
}

export type EnqueueStatus = 'started' | 'enqueued' | 'ignored_locked_to_other_channel';
export type ConnectStatus = 'joined' | 'already_connected' | 'ignored_locked_to_other_channel';
export type SkipStatus = 'skipped' | 'no_active_playback';
export type StopStatus = 'stopped' | 'not_connected';
export type DisconnectReason = 'manual_stop' | 'channel_empty' | 'text_inactive';

export interface EnqueuePayload {
  guildId: string;
  textChannelId: string;
  voiceChannelId: string;
  memberDisplayName: string;
  content: string;
  voiceChannel: VoiceChannelLike;
}

export interface QueueStateSnapshot {
  lockedVoiceChannelId: string;
  boundTextChannelId: string;
  pendingCount: number;
  totalCount: number;
  isPlaying: boolean;
  lastTextActivityAt: number;
  inactivityDeadlineAt: number;
  currentItem: {
    memberDisplayName: string;
    content: string;
  } | null;
}

class DiscordAudioPlayerAdapter implements AudioPlayerLike {
  public constructor(public readonly raw: AudioPlayer) {}

  public play(resource: unknown): void {
    this.raw.play(resource as never);
  }

  public stop(force?: boolean): boolean {
    return this.raw.stop(force);
  }
}

class DiscordVoiceConnectionAdapter implements VoiceConnectionLike {
  public constructor(public readonly raw: VoiceConnection) {}

  public destroy(): void {
    this.raw.destroy();
  }
}

class DiscordVoiceRuntime implements VoiceRuntime {
  public createPlayer(handlers: QueuePlayerHandlers): AudioPlayerLike {
    const player = createAudioPlayer();
    player.on(AudioPlayerStatus.Idle, handlers.onIdle);
    player.on('error', handlers.onError);
    return new DiscordAudioPlayerAdapter(player);
  }

  public async join(channel: VoiceChannelLike): Promise<VoiceConnectionLike> {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    return new DiscordVoiceConnectionAdapter(connection);
  }

  public subscribe(connection: VoiceConnectionLike, player: AudioPlayerLike): void {
    (connection as DiscordVoiceConnectionAdapter).raw.subscribe((player as DiscordAudioPlayerAdapter).raw);
  }

  public destroy(connection: VoiceConnectionLike): void {
    connection.destroy();
  }
}

export class QueueManager {
  private readonly queues = new Map<string, ServerQueue>();
  private readonly voiceRuntime: VoiceRuntime;

  public constructor(
    private readonly options: {
      logger: Logger;
      ttsService: TtsService;
      voiceRuntime?: VoiceRuntime;
    }
  ) {
    this.voiceRuntime = options.voiceRuntime ?? new DiscordVoiceRuntime();
  }

  public async enqueue(payload: EnqueuePayload): Promise<{ status: EnqueueStatus }> {
    const connectResult = await this.connect(payload);

    if (connectResult.status === 'ignored_locked_to_other_channel') {
      return { status: 'ignored_locked_to_other_channel' };
    }

    const queue = this.queues.get(payload.guildId);

    if (!queue) {
      throw new Error(`Voice session was not created for guild ${payload.guildId}.`);
    }

    const status: EnqueueStatus = queue.currentItem || queue.isAdvancing ? 'enqueued' : 'started';

    queue.items.push({
      textChannelId: payload.textChannelId,
      memberDisplayName: payload.memberDisplayName,
      content: payload.content
    });

    if (status === 'started') {
      void this.playNext(queue);
    }

    return { status };
  }

  public async connect(payload: EnqueuePayload): Promise<{ status: ConnectStatus }> {
    const existingQueue = this.queues.get(payload.guildId);

    if (existingQueue && existingQueue.voiceChannelId !== payload.voiceChannelId) {
      return { status: 'ignored_locked_to_other_channel' };
    }

    const queue = existingQueue ?? (await this.createQueue(payload));
    queue.textChannelId = payload.textChannelId;
    this.recordTextActivity(payload.guildId, payload.textChannelId);

    return {
      status: existingQueue ? 'already_connected' : 'joined'
    };
  }

  public skip(guildId: string): SkipStatus {
    const queue = this.queues.get(guildId);

    if (!queue || !queue.currentItem) {
      return 'no_active_playback';
    }

    queue.player.stop(true);
    return 'skipped';
  }

  public stop(guildId: string): StopStatus {
    const queue = this.queues.get(guildId);

    if (!queue) {
      return 'not_connected';
    }

    this.disconnect(guildId, 'manual_stop');
    return 'stopped';
  }

  public recordTextActivity(guildId: string, textChannelId: string): boolean {
    const queue = this.queues.get(guildId);

    if (!queue || queue.textChannelId !== textChannelId) {
      return false;
    }

    queue.lastTextActivityAt = Date.now();
    this.scheduleInactivityTimeout(queue);
    return true;
  }

  public updateBoundTextChannel(guildId: string, textChannelId: string): boolean {
    const queue = this.queues.get(guildId);

    if (!queue) {
      return false;
    }

    queue.textChannelId = textChannelId;
    queue.lastTextActivityAt = Date.now();
    this.scheduleInactivityTimeout(queue);
    return true;
  }

  public disconnectIfChannelEmpty(guildId: string, humanMemberCount: number): boolean {
    if (humanMemberCount > 0) {
      return false;
    }

    return this.disconnect(guildId, 'channel_empty');
  }

  public getState(guildId: string): QueueStateSnapshot | null {
    const queue = this.queues.get(guildId);

    if (!queue) {
      return null;
    }

    return {
      lockedVoiceChannelId: queue.voiceChannelId,
      boundTextChannelId: queue.textChannelId,
      pendingCount: queue.items.length,
      totalCount: queue.items.length + (queue.currentItem ? 1 : 0),
      isPlaying: queue.currentItem !== null,
      lastTextActivityAt: queue.lastTextActivityAt,
      inactivityDeadlineAt: queue.lastTextActivityAt + VOICE_SESSION_INACTIVITY_MS,
      currentItem: queue.currentItem
        ? {
            memberDisplayName: queue.currentItem.memberDisplayName,
            content: queue.currentItem.content
          }
        : null
    };
  }

  public destroyAll(): void {
    for (const guildId of [...this.queues.keys()]) {
      this.disconnect(guildId, 'manual_stop');
    }
  }

  private async createQueue(payload: EnqueuePayload): Promise<ServerQueue> {
    const player = this.voiceRuntime.createPlayer({
      onIdle: () => {
        void this.handleIdle(payload.guildId);
      },
      onError: (error) => {
        void this.handleError(payload.guildId, error);
      }
    });

    const connection = await this.voiceRuntime.join(payload.voiceChannel);
    this.voiceRuntime.subscribe(connection, player);

    const queue: ServerQueue = {
      guildId: payload.guildId,
      voiceChannelId: payload.voiceChannelId,
      textChannelId: payload.textChannelId,
      connection,
      player,
      items: [],
      currentItem: null,
      isAdvancing: false,
      lastTextActivityAt: Date.now(),
      inactivityTimer: null
    };

    this.scheduleInactivityTimeout(queue);
    this.queues.set(payload.guildId, queue);
    return queue;
  }

  private scheduleInactivityTimeout(queue: ServerQueue): void {
    if (queue.inactivityTimer) {
      clearTimeout(queue.inactivityTimer);
    }

    const expectedLastActivityAt = queue.lastTextActivityAt;
    queue.inactivityTimer = setTimeout(() => {
      this.handleTextInactivity(queue.guildId, expectedLastActivityAt);
    }, VOICE_SESSION_INACTIVITY_MS);
  }

  private handleTextInactivity(guildId: string, expectedLastActivityAt: number): void {
    const queue = this.queues.get(guildId);

    if (!queue || queue.lastTextActivityAt !== expectedLastActivityAt) {
      return;
    }

    this.disconnect(guildId, 'text_inactive');
  }

  private async playNext(queue: ServerQueue): Promise<void> {
    if (queue.isAdvancing) {
      return;
    }

    const nextItem = queue.items.shift();

    if (!nextItem) {
      queue.currentItem = null;
      return;
    }

    queue.isAdvancing = true;
    queue.currentItem = nextItem;

    try {
      const resource = await this.options.ttsService.createAudioResource(nextItem.content);
      queue.player.play(resource);
    } catch (error) {
      queue.currentItem = null;
      this.options.logger.error(`Failed to create or play TTS audio for guild ${queue.guildId}.`, error);
    } finally {
      queue.isAdvancing = false;

      if (!queue.currentItem && queue.items.length > 0 && this.queues.has(queue.guildId)) {
        void this.playNext(queue);
      }
    }
  }

  private async handleIdle(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);

    if (!queue) {
      return;
    }

    queue.currentItem = null;

    if (queue.items.length > 0) {
      await this.playNext(queue);
    }
  }

  private async handleError(guildId: string, error: Error): Promise<void> {
    this.options.logger.error(`Audio player error in guild ${guildId}.`, error);

    const queue = this.queues.get(guildId);

    if (!queue) {
      return;
    }

    queue.currentItem = null;

    if (queue.items.length > 0) {
      await this.playNext(queue);
    }
  }

  private disconnect(guildId: string, reason: DisconnectReason): boolean {
    const queue = this.queues.get(guildId);

    if (!queue) {
      return false;
    }

    this.queues.delete(guildId);

    if (queue.inactivityTimer) {
      clearTimeout(queue.inactivityTimer);
      queue.inactivityTimer = null;
    }

    queue.items.length = 0;
    queue.currentItem = null;
    queue.player.stop(true);
    this.voiceRuntime.destroy(queue.connection);
    this.options.logger.info(`Disconnected voice session for guild ${guildId}.`, { reason });
    return true;
  }
}
