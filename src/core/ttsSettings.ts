export type TtsSpeechRate = number;

export const DEFAULT_TTS_SPEECH_RATE = 1;
export const MIN_TTS_SPEECH_RATE = 0.5;
export const MAX_TTS_SPEECH_RATE = 2;
export const TTS_SPEECH_RATE_PRESETS = [0.75, 1, 1.25, 1.5] as const;

export function normalizeTtsSpeechRate(value: number): TtsSpeechRate {
  if (!Number.isFinite(value)) {
    return DEFAULT_TTS_SPEECH_RATE;
  }

  const clamped = Math.min(MAX_TTS_SPEECH_RATE, Math.max(MIN_TTS_SPEECH_RATE, value));
  return Math.round(clamped * 100) / 100;
}

export function parseTtsSpeechRate(value: number | string): TtsSpeechRate | null {
  if (typeof value === 'number') {
    return isTtsSpeechRate(value) ? normalizeTtsSpeechRate(value) : null;
  }

  const trimmed = value.trim().toLowerCase();

  if (trimmed === 'normal') {
    return DEFAULT_TTS_SPEECH_RATE;
  }

  if (trimmed === 'slow') {
    return 0.75;
  }

  const numericValue = Number.parseFloat(trimmed.replace(/x$/i, ''));

  if (!isTtsSpeechRate(numericValue)) {
    return null;
  }

  return normalizeTtsSpeechRate(numericValue);
}

export function isTtsSpeechRate(value: number): value is TtsSpeechRate {
  return Number.isFinite(value) && value >= MIN_TTS_SPEECH_RATE && value <= MAX_TTS_SPEECH_RATE;
}

export function formatTtsSpeechRate(rate: TtsSpeechRate): string {
  const normalized = normalizeTtsSpeechRate(rate);
  return `${normalized.toFixed(normalized % 1 === 0 ? 1 : 2)}x`;
}

export function getTtsSpeechRateLabel(rate: TtsSpeechRate): string {
  return formatTtsSpeechRate(rate);
}
