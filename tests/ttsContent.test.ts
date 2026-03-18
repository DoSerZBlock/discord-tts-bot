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

  it('replaces custom emoji with just the emoji name', () => {
    const content = replaceMentionsForTts('這個好好笑 <:Ollie6:793863008359153694> <a:dance_time:123>', {});

    expect(content).toBe('這個好好笑 Ollie6 dance_time');
  });

  it('replaces youtube links with a short label', () => {
    const content = replaceMentionsForTts('看這個 https://www.youtube.com/watch?v=EezOPmJKQd0', {});

    expect(content).toBe('看這個 youtube連結');
  });

  it('replaces generic links with the main domain label', () => {
    const content = replaceMentionsForTts('文件在 <https://docs.github.com/en/actions>。', {});

    expect(content).toBe('文件在 github連結。');
  });
});
