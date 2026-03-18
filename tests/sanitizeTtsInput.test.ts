import { describe, expect, it } from 'vitest';
import { sanitizeTtsInput } from '../src/core/sanitize';

describe('sanitizeTtsInput', () => {
  it('returns null for empty content', () => {
    expect(sanitizeTtsInput('   \n\t   ')).toBeNull();
  });

  it('normalizes whitespace and new lines', () => {
    expect(sanitizeTtsInput('hello   \n world')).toBe('hello world');
  });

  it('truncates messages longer than 200 characters', () => {
    const result = sanitizeTtsInput('a'.repeat(220));

    expect(result).toHaveLength(200);
  });
});
