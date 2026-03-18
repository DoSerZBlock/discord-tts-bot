export function sanitizeTtsInput(content: string): string | null {
  const normalized = content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, 200);
}
