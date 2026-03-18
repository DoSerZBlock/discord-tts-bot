export interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

function formatMeta(meta: unknown): string {
  if (meta === undefined) {
    return '';
  }

  if (meta instanceof Error) {
    return `\n${meta.stack ?? meta.message}`;
  }

  return `\n${JSON.stringify(meta, null, 2)}`;
}

export const logger: Logger = {
  info(message, meta) {
    console.log(`[INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message, meta) {
    console.warn(`[WARN] ${message}${formatMeta(meta)}`);
  },
  error(message, meta) {
    console.error(`[ERROR] ${message}${formatMeta(meta)}`);
  }
};
