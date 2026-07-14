# Slack Maintenance Bot

Production-ready Slack Bolt app that provides a shared `/maintenance` slash command for announcing maintenance windows across multiple channels.

## Features

- `/maintenance` opens a modal to collect title, window, impact, custom message, and announcement type
- After submit, the requester sees an ephemeral **preview** with **Send** / **Cancel**
- **Send** posts the announcement to every channel listed in `channels.json`
- Usage restricted to Slack user IDs in `allowed-users.json`
- Every send attempt (success or failure) is logged to stdout and `logs/send-attempts.log`
- Express receiver (HTTP) — suitable for Render and other web hosts
- `GET /health` health check endpoint

## Requirements

- Node.js 18+
- A Slack app with Bot Token and Signing Secret

## Quick start (local)

### 1. Clone and install

```bash
cd slack-maintenance-bot
cp .env.example .env
npm install
```

### 2. Configure environment

Edit `.env`:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
PORT=3000
```

### 3. Configure channels and allowed users

**`channels.json`** — channel IDs that receive announcements:

```json
["C0123456789", "C9876543210"]
```

**`allowed-users.json`** — user IDs allowed to run `/maintenance`:

```json
["U0123456789", "U9876543210"]
```

Tip: In Slack, right-click a channel or user → **Copy link** → the ID is the trailing `C…` / `U…` segment. Or use the Slack API (`conversations.list`, `users.list`).

### 4. Create the Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **OAuth & Permissions** → Bot Token Scopes:
   - `commands`
   - `chat:write`
   - `chat:write.public` (optional; needed only if the bot posts to public channels it has not joined)
   - `im:write` (optional; used as a DM fallback for previews)
3. **Install to Workspace** and copy the **Bot User OAuth Token** → `SLACK_BOT_TOKEN`
4. **Basic Information** → copy **Signing Secret** → `SLACK_SIGNING_SECRET`
5. **Slash Commands** → **Create New Command**:
   - Command: `/maintenance`
   - Request URL: `https://YOUR_HOST/slack/events`
   - Short description: `Announce a maintenance window`
6. **Interactivity & Shortcuts**:
   - Turn **Interactivity** On
   - Request URL: `https://YOUR_HOST/slack/events`
7. Invite the bot to each channel in `channels.json` (`/invite @YourBot`) unless you use `chat:write.public`

### 5. Run locally (with a public tunnel)

```bash
npm start
```

Expose the app (example with [ngrok](https://ngrok.com/)):

```bash
ngrok http 3000
```

Use the ngrok HTTPS URL as `YOUR_HOST` in the Slack Request URLs above.

Health check:

```bash
curl http://localhost:3000/health
```

## Deploy to Render

### Option A — Blueprint (`render.yaml`)

This repo includes a `render.yaml`. In the Render dashboard:

1. **New** → **Blueprint**
2. Connect the Git repository
3. Render creates a Web Service from the blueprint
4. Set environment variables (see below)
5. Deploy

### Option B — Manual Web Service

1. Push this repo to GitHub/GitLab
2. In [Render](https://render.com) → **New** → **Web Service**
3. Connect the repository
4. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance type**: Free or Starter
5. Environment variables:

| Key | Value |
|-----|--------|
| `SLACK_BOT_TOKEN` | `xoxb-...` |
| `SLACK_SIGNING_SECRET` | your signing secret |
| `NODE_ENV` | `production` |

Render sets `PORT` automatically — do not hardcode it.

6. Deploy and copy the service URL, e.g. `https://slack-maintenance-bot.onrender.com`
7. Update Slack app Request URLs to:
   - `https://slack-maintenance-bot.onrender.com/slack/events`
8. Verify: `https://slack-maintenance-bot.onrender.com/health`

### Free tier note

Render free web services spin down after idle time. The first Slack request after sleep may time out. Prefer a paid instance for production slash-command latency, or keep the service awake with an external health ping.

## Usage

1. An allowed user runs `/maintenance` in Slack
2. Fills in title, window, impact, custom message, and announcement type
3. Submits the modal → receives a private **preview**
4. Clicks **Send** to post to all `channels.json` targets, or **Cancel** to abort

## Logging

Each channel post (or failure) is recorded as JSON:

- **stdout** — for Render / platform log drains: `[send-attempt] {...}`
- **`logs/send-attempts.log`** — file append on disk (ephemeral on many hosts; rely on stdout in production)

Example entry:

```json
{
  "timestamp": "2026-07-14T15:30:00.000Z",
  "userId": "U0123456789",
  "channelId": "C0123456789",
  "title": "API platform maintenance",
  "announcementType": "scheduled",
  "success": true,
  "ts": "1720967400.000100"
}
```

## Project structure

```
├── allowed-users.json   # Who can run /maintenance
├── channels.json        # Where announcements are posted
├── .env.example
├── package.json
├── render.yaml
├── README.md
└── src/
    ├── app.js           # Bolt + Express entrypoint
    ├── auth.js          # Allowed-user checks
    ├── blocks.js        # Modal + message Block Kit builders
    ├── config.js        # Env + JSON config loading
    └── logger.js        # Send-attempt logging
```

## Security notes

- Keep `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` secret; never commit `.env`
- Only users listed in `allowed-users.json` can open the modal or send
- Slack request signatures are verified by the Express receiver
- Review `channels.json` carefully — Send broadcasts to every listed channel

## License

MIT
