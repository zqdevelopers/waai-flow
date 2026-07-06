# WAAI Flow

Open-source WhatsApp AI automation platform — visual flow builder, AI agents, multi-session management, broadcasts, webhooks, and real-time analytics.

**Maintainer:** ZQ Developers &nbsp;|&nbsp; **Support:** +923144916432

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/zqdevelopers/waai-flow?style=social)](https://github.com/zqdevelopers/waai-flow/stargazers)
[![Issues](https://img.shields.io/github/issues/zqdevelopers/waai-flow)](https://github.com/zqdevelopers/waai-flow/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Feature Status

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully working |
| 🟡 | Partial — works but has known gaps |
| ❌ | Not yet implemented |
| 🗺️ | Planned for a future release |
| 🏢 | Requires WhatsApp Business API |

### Core Automation

| Feature | Status | Notes |
|---------|--------|-------|
| Visual Flow Builder | ✅ | Drag-and-drop canvas with 8+ node types |
| Webhook trigger node | 🟡 | Keyword filter active in backend; UI config field coming soon |
| AI Chat node | ✅ | Works with any configured provider |
| Send Message node | ✅ | 14 types: text, image, video, audio, gif, document, location, contacts, sticker, poll, buttons, list, URL buttons, native flow |
| Condition node | ✅ | Branch flow on variable equality |
| Delay node | ✅ | Up to 30 s per node |
| Set Variable / Text Formatter | ✅ | `{{variable.path}}` template syntax |
| HTTP Request node | ✅ | GET / POST / PUT / DELETE with headers and body |
| Flow import / export | ❌ | Coming soon |
| Flow duplicate / clone | ❌ | Coming soon |
| Flow version history | 🗺️ | Planned |

### WhatsApp Sessions

| Feature | Status | Notes |
|---------|--------|-------|
| QR code login | ✅ | |
| Multi-session support | ✅ | Unlimited sessions |
| Auto-reconnect with backoff | ✅ | 5 attempts: 1 s → 2 s → 4 s → 8 s → 16 s, then stops |
| QR expiry indicator | ❌ | Coming soon |
| Session rename | ❌ | Coming soon |
| Profile picture upload | 🟡 | Supported via Baileys; may be restricted on personal accounts |

### Broadcasts

| Feature | Status | Notes |
|---------|--------|-------|
| Create & run broadcast | ✅ | Non-blocking; frontend polls for progress |
| Edit draft broadcast | ❌ | Coming soon |
| Cancel running broadcast | ❌ | Coming soon |
| Broadcast message types | 🟡 | Text only currently; image/button/list coming soon |
| Scheduled broadcasts | 🗺️ | Planned |
| Per-recipient delivery tracking | 🗺️ | Planned |

### AI & Agents

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI integration | ✅ | GPT-4o, GPT-4 Turbo, etc. |
| Anthropic Claude | ✅ | Via configured provider |
| Custom AI providers | ✅ | Add base URL + API key in Settings |
| Agent profiles page | 🟡 | Profiles exist but not yet linked to Flow Builder AI Chat nodes |
| AI flow generator | 🗺️ | Planned — describe in plain language, get nodes auto-generated |

### Messaging & Conversations

| Feature | Status | Notes |
|---------|--------|-------|
| Send all message types via API | ✅ | 14 types |
| Conversation inbox (read + reply) | ✅ | |
| Real-time incoming message push | ❌ | Coming soon |
| Message search | ✅ | In-memory Baileys message store |
| Paginated messages/conversations | 🟡 | Backend supports `?limit=` and `?cursor=`; frontend load-more UI coming soon |
| Contact manager | 🗺️ | Planned |

### Webhooks

| Feature | Status | Notes |
|---------|--------|-------|
| Inbound webhook trigger | ✅ | `POST /api/webhook/:flowId` |
| Webhook secret validation | ✅ | `x-webhook-secret` header |
| Variable mappings on trigger | ✅ | Map payload paths to flow variables |
| GET webhook support | ❌ | Coming soon |
| Per-flow rate limiting | ❌ | Coming soon |
| Webhook retry queue | 🗺️ | Planned |

### WhatsApp Business Only

| Feature | Status | Notes |
|---------|--------|-------|
| Native message templates | 🏢 | Requires WA Business API approval |
| PIX payment messages | 🏢 | Brazil only; WA Business API |
| WhatsApp Shop / catalog | 🏢 | WA Business API with catalog access |
| LaTeX image rendering | 🗺️ | Requires external image generation service |

---

## Known Issues

> ✅ All 13 confirmed bugs from the v1.0.0 audit have been resolved. No open issues at this time.
>
> Found something? [Open an issue →](https://github.com/zqdevelopers/waai-flow/issues)

---

## Roadmap

### Near Term

- [ ] Keyword / regex filter UI for webhook trigger node
- [ ] Edit draft broadcasts (`PUT /modules/broadcasts/:id`)
- [ ] Cancel running broadcast
- [ ] Broadcast message type selector (image, buttons, list)
- [ ] Link Agent profiles to Flow Builder AI Chat node
- [ ] Flow delete + duplicate buttons in sidebar
- [ ] Flow export / import as JSON
- [ ] QR code expiry countdown
- [ ] Real-time conversation inbox (Socket.io push)
- [ ] Pagination load-more UI (backend already supports `?limit=` and `?cursor=`)

### ⭐ 50-Star Milestone

> These features will be built when this repo reaches **50 GitHub stars**.
> [Star to unlock →](https://github.com/zqdevelopers/waai-flow/stargazers)

- [ ] **Multi-user support** — roles: admin / operator / viewer
- [ ] **Flow marketplace** — export / import `.waai.json` community templates
- [ ] **AI flow generator** — describe a flow in plain English, get nodes auto-built
- [ ] **Scheduled broadcasts** — send at a specified date and time
- [ ] **Real-time conversation inbox** — Socket.io push, unread badge in nav
- [ ] **Per-flow analytics** — trigger count, success rate, node error heatmap
- [ ] **n8n / Make / Zapier integration** — standardized webhook in/out format
- [ ] **WhatsApp contact manager** — tag, search, block / unblock contacts
- [ ] **Docker Compose + Postgres stack** — one-command self-host with durable database
- [ ] **Broadcast analytics** — per-recipient sent / failed / pending tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express, Prisma, SQLite |
| WhatsApp | `@innovatorssoft/baileys` |
| Frontend | React 18, Vite, Tailwind CSS, React Flow, Recharts |
| Auth | Custom HMAC-SHA256 JWT |
| Real-time | Socket.IO |
| Deployment | PM2, Docker, Railway, Render, Replit |

---

## Requirements

- Node.js 22+
- npm

---

## Quick Start

**1. Install dependencies**

```bash
npm run install:all
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=replace-with-a-long-random-string
DATABASE_URL=file:./data/db.sqlite
```

**3. Initialize database**

```bash
cd backend && npx prisma db push && cd ..
```

**4. Start development servers**

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

Login: `admin` / `your-strong-password`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install all dependencies |
| `npm run dev` | Start both servers with hot reload |
| `npm run build` | Build frontend for production |
| `npm run start` | Start with PM2 (production) |
| `npm run stop` | Stop PM2 processes |
| `npm run logs` | Tail PM2 logs |

---

## Deploy on Railway

This repo includes `railway.json` for Railway deploys.

1. Push to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Connect `zqdevelopers/waai-flow`.
4. Add environment variables in Railway **Variables**:

```env
ADMIN_USERNAME=your-admin-user
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=your-long-random-secret
DATABASE_URL=file:./data/db.sqlite
DATA_PATH=./data
```

5. Railway auto-detects the `Dockerfile` and deploys. Health check runs at `/api/status`.

> For persistent data, add a Railway Volume mounted at `/app/data` and set `DATA_PATH=/app/data`.

---

## Deploy on Render

This repo includes `render.yaml` for a single-service deploy.

1. Push to GitHub.
2. In Render: **New → Blueprint → Connect `zqdevelopers/waai-flow`**.
3. Set secret env vars when prompted:

```env
ADMIN_USERNAME=your-admin-user
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=your-long-random-secret
```

> Render free tier does not persist the filesystem — SQLite, session files, and uploads are lost on restart. Use a paid service with a persistent disk and set `DATA_PATH` to the mount path.

---

## Deploy on Replit

1. **Create App → Import from GitHub** → `https://github.com/zqdevelopers/waai-flow`
2. Add Secrets:

```env
DATABASE_URL=file:./dev.db
ADMIN_USERNAME=your-admin-user
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=your-long-random-secret
```

3. Run once in Shell: `npm run render:build`
4. Click **Run** → **Publish → Reserved VM**

> Use Reserved VM, not Autoscale — Autoscale can idle and disconnect active WhatsApp sessions.

---

## Docker

```bash
docker compose up --build
```

Set environment variables and mount a persistent volume for `/app/data` before deploying publicly.

---

## Pre-deploy Checklist

- [ ] Set `ADMIN_PASSWORD` and `AUTH_SECRET` to strong unique values
- [ ] Replace the support WhatsApp number in `README.md` and `SUPPORT.md`
- [ ] Confirm `.env`, `sessions/`, `uploads/`, `node_modules/`, `dist/`, and `*.db` are in `.gitignore`
- [ ] Run `npm run build` before tagging a release

---

## Important Notice

This project uses Baileys for WhatsApp Web automation and is not affiliated with or endorsed by WhatsApp Inc. Do not use it to spam, harass, or scrape. We do not condone any use that violates WhatsApp Terms of Service, consent, privacy, or local law.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
