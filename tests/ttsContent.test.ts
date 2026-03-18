import { describe, expect, it } from 'vitest';
import { replaceMentionsForTts } from '../src/core/ttsContent';

describe('replaceMentionsForTts', () => {
  it('replaces user mentions with display names', () => {
    const content = replaceMentionsForTts('哈囉 <@123456>', {
      users: new Map([['123456', '小明']])
    });

    expect(content).toBe('哈囉 小明');
  });

  it('falls back to generic labels when names are unavailable', () => {
    const content = replaceMentionsForTts('請找 <@999> 到 <#111>', {});

    expect(content).toBe('請找 某位使用者 到 某個頻道');
  });
});
