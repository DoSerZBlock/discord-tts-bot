# Discord TTS Bot

Chinese version: [README_TW.md](./README_TW.md)

A Discord text-to-speech bot built with TypeScript, `discord.js`, `@discordjs/voice`, `better-sqlite3`, and `google-tts-api`.

It is designed for multi-guild usage with persistent guild settings, per-guild voice queues, text-channel binding, user-level auto-join preferences, and configurable TTS playback speed.

## Features

- Per-guild TTS text-channel binding with SQLite persistence
- Independent voice queue and voice session per guild
- Embed-based `/config` panel for personal and guild settings
- Per-user auto-join toggle inside each guild
- Per-guild TTS playback speed, with presets and custom input from `0.5x` to `2.0x`
- Message cleanup for TTS, including:
  - mention replacement
  - custom emoji shortening
  - shortcode-style emoji shortening
  - URL shortening such as `youtube` links
- Queue and session controls with `/join`, `/skip`, `/stop`, and `/ttsstatus`
- Docker-ready runtime with persisted SQLite data

## Commands

- `/sync`
  Re-sync slash commands for the current bot deployment.
- `/config`
  Open the embed settings panel. Personal auto-join is stored per user per guild. TTS speed is stored per guild.
- `/settts [channel]`
  Set the text channel that should be read aloud.
- `/cleartts`
  Remove the current guild's TTS channel binding.
- `/ttsstatus`
  Show the current bound text channel, queue state, and current TTS speed.
- `/join`
  Ask the bot to join your current voice channel.
- `/skip`
  Skip the currently playing TTS item.
- `/stop`
  Clear the queue and disconnect the bot from voice.

## Settings Scope

- Personal auto-join:
  Stored per user per guild.
- TTS speed:
  Stored per guild.

Changing the speed in one guild does not affect other guilds.

## Requirements

- Node.js 20+
- `ffmpeg`
- A Discord bot with these gateway intents enabled:
  - `Guilds`
  - `GuildMessages`
  - `GuildMessageTyping`
  - `GuildVoiceStates`
  - `MessageContent`

## Environment Variables

Copy [.env.example](./.env.example) to `.env` and configure:

- `DISCORD_TOKEN`
  Your Discord bot token.
- `CLIENT_ID`
  Your Discord application client ID.
- `DEV_GUILD_ID`
  Optional. If set, slash commands are registered only to that guild.
- `DATABASE_PATH`
  Optional. Defaults to `./data/tts_config.db`.
- `TTS_LANGUAGE`
  Optional. Defaults to `zh-TW`.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Register slash commands.

```bash
npm run sync
```

4. Start the bot in development mode.

```bash
npm run dev
```

## Build and Test

```bash
npm run build
npm test
```

## Docker

Build and start:

```bash
docker compose up --build -d
```

Register production slash commands:

```bash
docker compose run --rm bot npm run sync:prod
```

SQLite data is persisted through the `./data:/app/data` volume mapping.

## Notes

- The bot only reads messages from the bound text channel for each guild.
- If a guild voice session is already locked to another voice channel, messages from other voice channels in that guild are ignored.
- The bot keeps waiting in voice after playback and disconnects later if the bound text channel stays inactive long enough.
