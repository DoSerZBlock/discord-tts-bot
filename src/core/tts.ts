import { createAudioResource, demuxProbe } from '@discordjs/voice';
import { getAudioUrl } from 'google-tts-api';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { normalizeTtsSpeechRate, type TtsSpeechRate } from './ttsSettings';

export interface TtsService {
  createAudioResource(text: string, speechRate: TtsSpeechRate): Promise<unknown>;
}

function buildAtempoFilter(speechRate: TtsSpeechRate): string {
  let remainingRate = normalizeTtsSpeechRate(speechRate);
  const filters: string[] = [];

  while (remainingRate > 2) {
    filters.push('atempo=2');
    remainingRate /= 2;
  }

  while (remainingRate < 0.5) {
    filters.push('atempo=0.5');
    remainingRate /= 0.5;
  }

  filters.push(`atempo=${remainingRate.toFixed(2)}`);
  return filters.join(',');
}

function createTempoAdjustedStream(inputStream: Readable, speechRate: TtsSpeechRate): Readable {
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    'pipe:0',
    '-filter:a',
    buildAtempoFilter(speechRate),
    '-f',
    'mp3',
    'pipe:1'
  ]);

  const stderrChunks: Buffer[] = [];
  ffmpeg.stderr?.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  ffmpeg.on('error', (error) => {
    ffmpeg.stdout.destroy(error);
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      return;
    }

    const errorOutput = Buffer.concat(stderrChunks).toString('utf8').trim();
    ffmpeg.stdout.destroy(new Error(`ffmpeg exited with code ${code}${errorOutput ? `: ${errorOutput}` : ''}`));
  });

  ffmpeg.stdin.on('error', () => {
    // Ignore EPIPE-style errors when ffmpeg exits early.
  });

  inputStream.pipe(ffmpeg.stdin);
  return ffmpeg.stdout;
}

export class GoogleTtsService implements TtsService {
  public constructor(private readonly language: string) {}

  public async createAudioResource(text: string, speechRate: TtsSpeechRate): Promise<unknown> {
    const audioUrl = getAudioUrl(text, {
      lang: this.language,
      slow: false
    });

    const response = await fetch(audioUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch TTS audio: ${response.status} ${response.statusText}`);
    }

    const audioStream = Readable.fromWeb(response.body as never);
    const adjustedStream = normalizeTtsSpeechRate(speechRate) === 1 ? audioStream : createTempoAdjustedStream(audioStream, speechRate);
    const { stream, type } = await demuxProbe(adjustedStream);

    return createAudioResource(stream, {
      inputType: type,
      metadata: {
        text
      }
    });
  }
}
