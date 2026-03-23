import { describe, expect, it } from 'vitest';
import {
  formatTtsSpeechRate,
  parseTtsSpeechRate,
  DEFAULT_TTS_SPEECH_RATE,
  MAX_TTS_SPEECH_RATE,
  MIN_TTS_SPEECH_RATE
} from '../src/core/ttsSettings';

describe('ttsSettings', () => {
  it('parses numeric speech rates and trims x suffixes', () => {
    expect(parseTtsSpeechRate('1.25')).toBe(1.25);
    expect(parseTtsSpeechRate('0.8x')).toBe(0.8);
  });

  it('keeps compatibility with legacy normal and slow values', () => {
    expect(parseTtsSpeechRate('normal')).toBe(DEFAULT_TTS_SPEECH_RATE);
    expect(parseTtsSpeechRate('slow')).toBe(0.75);
  });

  it('rejects values outside the supported range', () => {
    expect(parseTtsSpeechRate(String(MIN_TTS_SPEECH_RATE - 0.01))).toBeNull();
    expect(parseTtsSpeechRate(String(MAX_TTS_SPEECH_RATE + 0.01))).toBeNull();
  });

  it('formats speech-rate labels in x notation', () => {
    expect(formatTtsSpeechRate(1)).toBe('1.0x');
    expect(formatTtsSpeechRate(1.25)).toBe('1.25x');
  });
});
