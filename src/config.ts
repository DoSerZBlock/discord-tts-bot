import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

loadDotenv();

export interface AppConfig {
  discordToken: string;
  clientId: string;
  devGuildId: string | null;
  databasePath: string;
  ttsLanguage: string;
}

function requireEnv(name: 'DISCORD_TOKEN' | 'CLIENT_ID', value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    discordToken: requireEnv('DISCORD_TOKEN', env.DISCORD_TOKEN),
    clientId: requireEnv('CLIENT_ID', env.CLIENT_ID),
    devGuildId: env.DEV_GUILD_ID?.trim() || null,
    databasePath: path.resolve(env.DATABASE_PATH?.trim() || './data/tts_config.db'),
    ttsLanguage: env.TTS_LANGUAGE?.trim() || 'zh-TW'
  };
}
