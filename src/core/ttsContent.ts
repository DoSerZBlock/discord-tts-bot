export interface TtsMentionMaps {
  users?: ReadonlyMap<string, string>;
  roles?: ReadonlyMap<string, string>;
  channels?: ReadonlyMap<string, string>;
}

export function replaceMentionsForTts(content: string, maps: TtsMentionMaps): string {
  return content
    .replace(/<@!?(\d+)>/g, (_, userId: string) => maps.users?.get(userId) ?? '某位使用者')
    .replace(/<@&(\d+)>/g, (_, roleId: string) => maps.roles?.get(roleId) ?? '某個身分組')
    .replace(/<#(\d+)>/g, (_, channelId: string) => maps.channels?.get(channelId) ?? '某個頻道');
}
