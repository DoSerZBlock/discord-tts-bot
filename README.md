# discord-tts-bot

以 TypeScript、`discord.js`、`@discordjs/voice`、`better-sqlite3` 與 `google-tts-api` 建立的 Discord TTS 機器人。它支援多 guild 獨立佇列、SQLite 持久化綁定文字頻道，以及在綁定頻道發文時自動朗讀。

## 功能

- `/sync`：重新同步目前 bot 的 slash commands
- `/config`：用 embed 畫面調整你的個人設定，例如自動進入語音
- `/settts [channel]`：設定 TTS 監聽文字頻道
- `/cleartts`：移除目前 guild 的 TTS 綁定
- `/ttsstatus`：查看綁定頻道與佇列狀態
- `/join`：主動讓機器人加入你目前所在的語音頻道
- `/skip`：跳過目前播放中的 TTS
- `/stop`：清空佇列並離開語音頻道
- 每個 guild 擁有獨立的語音佇列與語音連線
- 若同 guild 已鎖定某個語音頻道播放，其他語音頻道的訊息會被靜默忽略
- 使用者可為自己開啟 auto-join，當他已在語音中並在綁定打字頻道開始打字或發訊時，讓機器人自動進入
- 機器人的互動回覆統一使用 embed

## 環境需求

- Node.js 20+
- Discord Bot 已啟用下列 Gateway Intents
  - `Guilds`
  - `GuildMessages`
  - `GuildMessageTyping`
  - `GuildVoiceStates`
  - `MessageContent`
- 系統安裝 `ffmpeg`

## 安裝與啟動

1. 安裝依賴：

   ```bash
   npm install
   ```

2. 建立環境變數：

   ```bash
   cp .env.example .env
   ```

3. 填入 `.env`：

   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `DEV_GUILD_ID`：選填。若有值，slash commands 只註冊到該 guild。
   - `DATABASE_PATH`：預設 `./data/tts_config.db`
   - `TTS_LANGUAGE`：預設 `zh-TW`

4. 註冊 slash commands：

   ```bash
   npm run sync
   ```

   若 bot 已經在線上，之後也可以直接在 Discord 內使用 `/sync` 重新同步指令。

5. 啟動 bot：

   ```bash
   npm run dev
   ```

## 建置與測試

```bash
npm run build
npm test
```

## Docker

建立並啟動：

```bash
docker compose up --build -d
```

註冊 commands：

```bash
docker compose run --rm bot npm run sync:prod
```

SQLite 檔案會透過 `./data:/app/data` volume 保留在主機端。
