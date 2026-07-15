import { describe, expect, it } from 'vitest';
import {
  MAX_IGNORED_PREFIX_LENGTH,
  startsWithIgnoredPrefix,
  validateIgnoredPrefix
} from '../src/core/ignoredPrefixes';

describe('validateIgnoredPrefix', () => {
  it('normalizes surrounding whitespace', () => {
    expect(validateIgnoredPrefix('  !!  ')).toEqual({
      valid: true,
      prefix: '!!'
    });
  });

  it('rejects blank and embedded whitespace', () => {
    expect(validateIgnoredPrefix('   ').valid).toBe(false);
    expect(validateIgnoredPrefix('! play').valid).toBe(false);
  });

  it('rejects prefixes that exceed the configured limit', () => {
    expect(validateIgnoredPrefix('x'.repeat(MAX_IGNORED_PREFIX_LENGTH + 1)).valid).toBe(false);
  });
});

describe('startsWithIgnoredPrefix', () => {
  it('matches a configured prefix after leading whitespace', () => {
    expect(startsWithIgnoredPrefix('   !play song', ['!', ';;'])).toBe(true);
    expect(startsWithIgnoredPrefix(';;queue', ['!', ';;'])).toBe(true);
  });

  it('does not match normal messages or empty content', () => {
    expect(startsWithIgnoredPrefix('hello!', ['!'])).toBe(false);
    expect(startsWithIgnoredPrefix('   ', ['!'])).toBe(false);
    expect(startsWithIgnoredPrefix('!play', [])).toBe(false);
  });
});
