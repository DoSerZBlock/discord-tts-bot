import { createAudioResource, demuxProbe } from '@discordjs/voice';
import { getAudioUrl } from 'google-tts-api';
import { Readable } from 'node:stream';

export interface TtsService {
  createAudioResource(text: string): Promise<unknown>;
}

export class GoogleTtsService implements TtsService {
  public constructor(private readonly language: string) {}

  public async createAudioResource(text: string): Promise<unknown> {
    const audioUrl = getAudioUrl(text, {
      lang: this.language,
      slow: false
    });

    const response = await fetch(audioUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch TTS audio: ${response.status} ${response.statusText}`);
    }

    const audioStream = Readable.fromWeb(response.body as never);
    const { stream, type } = await demuxProbe(audioStream);

    return createAudioResource(stream, {
      inputType: type,
      metadata: {
        text
      }
    });
  }
}
