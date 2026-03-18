export interface TtsMentionMaps {
  users?: ReadonlyMap<string, string>;
  roles?: ReadonlyMap<string, string>;
  channels?: ReadonlyMap<string, string>;
}

function inferLinkLabel(urlText: string): string {
  try {
    const hostname = new URL(urlText).hostname.toLowerCase();
    const normalizedHost = hostname.replace(/^(www|m|mobile)\./, '');

    if (normalizedHost === 'youtu.be' || normalizedHost === 'youtube.com') {
      return 'youtube連結';
    }

    const segments = normalizedHost.split('.').filter(Boolean);

    if (segments.length === 0) {
      return '連結';
    }

    if (
      segments.length >= 3 &&
      ['co', 'com', 'org', 'net'].includes(segments[segments.length - 2]) &&
      segments[segments.length - 1].length === 2
    ) {
      return `${segments[segments.length - 3]}連結`;
    }

    if (segments.length >= 2) {
      return `${segments[segments.length - 2]}連結`;
    }

    return `${segments[0]}連結`;
  } catch {
    return '連結';
  }
}

function replaceUrlsForTts(content: string): string {
  return content.replace(/<?https?:\/\/[^\s>]+>?/gi, (match) => {
    const rawUrl = match.startsWith('<') && match.endsWith('>') ? match.slice(1, -1) : match;
    const trailingMatch = rawUrl.match(/[.,!?;:)]*$/);
    const trailing = trailingMatch?.[0] ?? '';
    const urlWithoutTrailing = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    return `${inferLinkLabel(urlWithoutTrailing)}${trailing}`;
  });
}

export function replaceMentionsForTts(content: string, maps: TtsMentionMaps): string {
  return replaceUrlsForTts(content)
    .replace(/<@!?(\d+)>/g, (_, userId: string) => maps.users?.get(userId) ?? '某位使用者')
    .replace(/<@&(\d+)>/g, (_, roleId: string) => maps.roles?.get(roleId) ?? '某個身分組')
    .replace(/<#(\d+)>/g, (_, channelId: string) => maps.channels?.get(channelId) ?? '某個頻道')
    .replace(/<a?:([A-Za-z0-9_]+):\d+>/g, '$1');
}
