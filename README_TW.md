# Discord TTS Bot

English version: [README.md](./README.md)

這是一個使用 TypeScript、`discord.js`、`@discordjs/voice`、`better-sqlite3` 與 `google-tts-api` 製作的 Discord 文字轉語音機器人。

它支援多 guild 使用情境，包含持久化 guild 設定、每個 guild 獨立語音佇列、綁定文字頻道、使用者層級的 auto-join 偏好，以及可調整的 TTS 播放倍速。

## 功能

- 每個 guild 都可以獨立綁定 TTS 文字頻道，並透過 SQLite 持久化保存
- 每個 guild 都有獨立的語音連線與播放佇列
- 提供 embed 形式的 `/config` 設定面板，可調整個人與 guild 設定
- 使用者可在各自 guild 內切換個人 auto-join
- 每個 guild 都能設定獨立的 TTS 倍速，支援預設選項與 `0.5x` 到 `2.0x` 的自訂輸入
- 訊息在朗讀前會先做 TTS 清理，包含：
  - mentions 替換
  - 自訂 emoji 縮短
  - `:shortcode:` 類型 emoji 縮短
  - 連結縮短，例如 `youtube` 連結
- 提供 `/join`、`/skip`、`/stop`、`/ttsstatus` 等佇列與連線控制指令
- 可直接用 Docker 部署，SQLite 資料會保存在 volume 中

## 指令

- `/sync`
  重新同步目前 bot 的 slash commands。
- `/config`
  開啟 embed 設定面板。個人的 auto-join 設定是「每個 guild 各自分開」，TTS 倍速則是「每個 guild 一份」。
- `/settts [channel]`
  設定要朗讀的文字頻道。
- `/cleartts`
  移除目前 guild 的 TTS 頻道綁定。
- `/ttsstatus`
  查看目前綁定頻道、佇列狀態與 TTS 倍速。
- `/join`
  讓機器人加入你目前所在的語音頻道。
- `/skip`
  跳過目前播放中的 TTS。
- `/stop`
  清空佇列並讓機器人離開語音頻道。

## 設定作用範圍

- 個人 auto-join：
  以「使用者 + guild」為單位儲存。
- TTS 倍速：
  以 guild 為單位儲存。

所以你在 A guild 設定的倍速，不會影響 B guild。

## 環境需求

- Node.js 20+
- `ffmpeg`
- Discord Bot 需要啟用以下 Gateway Intents：
  - `Guilds`
  - `GuildMessages`
  - `GuildMessageTyping`
  - `GuildVoiceStates`
  - `MessageContent`

## 環境變數

先將 [.env.example](./.env.example) 複製成 `.env`，再填入：

- `DISCORD_TOKEN`
  Discord Bot Token。
- `CLIENT_ID`
  Discord Application Client ID。
- `DEV_GUILD_ID`
  選填。若有設定，slash commands 只會註冊到這個 guild。
- `DATABASE_PATH`
  選填。預設為 `./data/tts_config.db`。
- `TTS_LANGUAGE`
  選填。預設為 `zh-TW`。

## 本機啟動

1. 安裝依賴。

```bash
npm install
```

2. 建立環境檔。

```bash
cp .env.example .env
```

3. 註冊 slash commands。

```bash
npm run sync
```

4. 啟動開發模式。

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

註冊正式環境 slash commands：

```bash
docker compose run --rm bot npm run sync:prod
```

SQLite 資料會透過 `./data:/app/data` volume 映射保存。

## 補充說明

- 機器人只會朗讀各 guild 綁定文字頻道中的訊息。
- 如果某個 guild 的語音連線已鎖定在另一個語音頻道，該 guild 其他語音頻道的訊息會被忽略。
- 播放結束後機器人會先留在語音中待機，若綁定文字頻道長時間沒有活動，才會自動離開。
