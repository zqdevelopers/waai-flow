# WAAI Flow

Open-source WhatsApp AI automation platform with visual flows, agents, sessions, broadcasts, webhooks, analytics, file management, and advanced Baileys message features.

Maintainer: **ZQ Developers**

Support WhatsApp: **+923144916432**

## Features

- WhatsApp session QR login
- Visual flow builder with webhook, AI chat, and send-message nodes
- AI agents and AI provider management
- Executions, conversations, messages, broadcasts, webhooks, REST API docs
- Files, analytics, settings, environment, and logs pages
- Login-protected dashboard and APIs
- Dark and light modes with WhatsApp-style green UI
- Advanced `@innovatorssoft/baileys` support:
  - Text, image, video, audio, gif, document, location, contacts, polls, stickers
  - Buttons, URL buttons, copy buttons, lists, native flow, rich messages
  - Scheduler, auto-replies, anti-delete store, message search, typing indicator
  - JID plotting, vCard generation, status posting, group actions, privacy actions

## Tech Stack

- Backend: Node.js, Express, Prisma, SQLite, Socket.IO
- WhatsApp: `@innovatorssoft/baileys`
- Frontend: React, Vite, Tailwind CSS, React Flow, Recharts
- Deployment: PM2 or Docker Compose

## Requirements

- Node.js 22+
- npm
- SQLite

## Quick Start

Install all dependencies:

```bash
npm run install:all
```

Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and change:

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
AUTH_SECRET="change-this-to-a-long-random-secret"
```

Initialize the database:

```bash
cd backend
npx prisma db push
cd ..
```

Start development servers:

```bash
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Default Login

If you keep the example defaults:

- Username: `admin`
- Password: `change-this-password`

For local development in the current workspace, the previous default may be `admin123`. Always set your own password before publishing or deployment.

## Environment

Backend template:

```bash
backend/.env.example
```

Frontend template:

```bash
frontend/.env.example
```

Do not commit real `.env` files.

## Scripts

```bash
npm run install:all
npm run dev
npm run build
npm run start
npm run stop
npm run logs
```

## Production With PM2

Build frontend:

```bash
npm run build
```

Start both apps:

```bash
npm run start
```

View logs:

```bash
npm run logs
```

## Docker Compose

```bash
docker compose up --build
```

Before using Docker publicly, configure environment variables and persistent volumes for database, sessions, and uploads.

## Deploy On Render

This repo includes `render.yaml` for a one-service Render deploy. The backend serves the API and the built React dashboard from the same public URL.

1. Push this repository to GitHub.
2. Open Render Dashboard and choose **New** -> **Blueprint**.
3. Connect `zqdevelopers/waai-flow`.
4. Select the `main` branch and apply the detected `render.yaml`.
5. Add secret values when Render asks:

```env
ADMIN_USERNAME=your-admin-user
ADMIN_PASSWORD=your-strong-password
```

Render will run:

```bash
npm run render:build
npm run render:start
```

After deploy, open the Render URL and log in with your admin credentials.

Free Render services can run WAAI Flow for demos, but their local filesystem is not durable. That means SQLite data, uploaded files, and WhatsApp session files can be lost after restarts or redeploys. For a real public instance, use a paid Render service with a persistent disk and set `DATA_DIR` to the disk mount path, or migrate the app database to a managed database.

## Deploy On Replit

This repo includes `.replit` for Replit deployments. The same one-service production mode is used: Express serves the API and the built React dashboard.

1. In Replit, choose **Create App** -> **Import from GitHub**.
2. Import `https://github.com/zqdevelopers/waai-flow`.
3. Open **Secrets** and add:

```env
DATABASE_URL=file:./dev.db
ADMIN_USERNAME=your-admin-user
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=your-long-random-secret
AUTH_TOKEN_TTL_MS=86400000
PROJECT_OWNER_NAME=ZQ Developers
PROJECT_SUPPORT_WHATSAPP=+923144916432
```

4. Open the Shell and run once:

```bash
npm run render:build
```

5. Click **Run** to test the app.
6. Click **Publish** and choose an **Autoscale** or **Reserved VM** deployment.

For WAAI Flow, **Reserved VM** is the better Replit option if you want WhatsApp sessions to stay connected. Autoscale can idle and restart, which may disconnect WhatsApp sessions. Replit's built-in SQL database is PostgreSQL, while this project currently uses SQLite, so keep `DATABASE_URL=file:./dev.db` unless you migrate the Prisma schema to PostgreSQL.

## GitHub Upload Checklist

Before pushing:

- Replace support WhatsApp number in `README.md`, `SUPPORT.md`, and `backend/.env.example`.
- Change `ADMIN_PASSWORD` and `AUTH_SECRET` in your deployed `.env`.
- Confirm `.env`, `sessions`, `uploads`, `node_modules`, `dist`, and SQLite database files are not committed.
- Run:

```bash
npm run build
```

## Important Notice

This project uses Baileys for WhatsApp Web automation and is in no way affiliated with or endorsed by WhatsApp. Use it at your own discretion. Do not spam people with this project. We discourage any stalkerware, abusive bulk messaging, scraping, or automated messaging usage that violates consent, privacy, platform terms, or local law.

Liability and license: Baileys and its maintainers cannot be held liable for misuse of this application, as stated in the Baileys MIT license. The maintainers of Baileys do not condone use of this application in practices that violate WhatsApp Terms of Service. Use this application fairly, as it is intended to be used.

## License

MIT. See `LICENSE`.
