export const MAX_IGNORED_PREFIX_LENGTH = 16;
export const MAX_IGNORED_PREFIXES_PER_GUILD = 25;

export interface IgnoredPrefixValidationResult {
  valid: boolean;
  prefix: string;
  error?: string;
}

export function validateIgnoredPrefix(input: string): IgnoredPrefixValidationResult {
  const prefix = input.trim();

  if (prefix.length === 0) {
    return {
      valid: false,
      prefix,
      error: '前綴不可為空白。'
    };
  }

  if (prefix.length > MAX_IGNORED_PREFIX_LENGTH) {
    return {
      valid: false,
      prefix,
      error: `前綴最多只能有 ${MAX_IGNORED_PREFIX_LENGTH} 個字元。`
    };
  }

  if (/\s/u.test(prefix)) {
    return {
      valid: false,
      prefix,
      error: '前綴不可包含空白字元。'
    };
  }

  return {
    valid: true,
    prefix
  };
}

export function startsWithIgnoredPrefix(content: string, prefixes: readonly string[]): boolean {
  const normalizedContent = content.trimStart();

  if (normalizedContent.length === 0) {
    return false;
  }

  return prefixes.some((prefix) => normalizedContent.startsWith(prefix));
}
