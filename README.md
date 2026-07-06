# WAAI Flow

Open-source WhatsApp AI automation platform — visual flow builder, AI agents, multi-session management, broadcasts, webhooks, and real-time analytics.

**Maintainer:** ZQ Developers &nbsp;|&nbsp; **Support:** +923144916432

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/zqdevelopers/waai-flow?style=social)](https://github.com/zqdevelopers/waai-flow/stargazers)
[![Issues](https://img.shields.io/github/issues/zqdevelopers/waai-flow)](https://github.com/zqdevelopers/waai-flow/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Feature Status

Honest status for every feature. Use this to set expectations before deploying.

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully working |
| 🟡 | Partial — works but has known gaps (see notes) |
| ❌ | Missing — not yet implemented |
| 🗺️ | Roadmap — planned for a future release |
| 🏢 | Requires WhatsApp Business API |

### Core Automation

| Feature | Status | Notes |
|---------|--------|-------|
| Visual Flow Builder | ✅ | Drag-and-drop canvas with 8+ node types |
| Webhook trigger node | 🟡 | Keyword filter works in backend; UI input field not yet added |
| AI Chat node | ✅ | Uses any configured provider (OpenAI, Anthropic, etc.) |
| Send Message node | ✅ | All 14 message types: text, image, video, audio, gif, document, location, contacts, sticker, poll, buttons, list, URL buttons, native flow |
| Condition node | ✅ | Branches flow on variable equality |
| Delay node | ✅ | Up to 30 s per node |
| Set Variable / Text Formatter | ✅ | Template variables via `{{variable.path}}` |
| HTTP Request node | ✅ | GET / POST / PUT / DELETE with headers and body |
| Flow import / export | ❌ | Cannot share flows as JSON files yet |
| Flow duplicate / clone | ❌ | Must recreate manually |
| Flow version history | 🗺️ | Planned — save snapshot on every update |

### WhatsApp Sessions

| Feature | Status | Notes |
|---------|--------|-------|
| QR code login | ✅ | |
| Multi-session support | ✅ | Unlimited sessions |
| Auto-reconnect with backoff | ✅ | 5 attempts: 1 s → 2 s → 4 s → 8 s → 16 s, then stops |
| QR expiry indicator | ❌ | No countdown; QR expires in ~20 s with no visual feedback |
| Session rename | ❌ | Names are immutable after creation |
| Profile picture upload | 🟡 | Baileys supports it; may be restricted on personal accounts |

### Broadcasts

| Feature | Status | Notes |
|---------|--------|-------|
| Create broadcast | ✅ | |
| Run broadcast | ✅ | Non-blocking; frontend polls for progress |
| Edit draft broadcast | ❌ | No PUT endpoint; delete and recreate |
| Cancel running broadcast | ❌ | Runs to completion once started |
| Broadcast message types | 🟡 | Text only; image/button/list not yet supported |
| Scheduled broadcasts | 🗺️ | Planned — send at a specified date and time |
| Per-recipient delivery tracking | 🗺️ | Planned — see sent / failed / pending per number |

### AI & Agents

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI integration | ✅ | GPT-4o, GPT-4 Turbo, etc. |
| Anthropic Claude | ✅ | Via configured provider |
| Custom AI providers | ✅ | Add base URL + API key in Settings |
| Agent profiles page | 🟡 | Profiles exist but are **not linked** to Flow Builder AI Chat nodes |
| AI flow generator | 🗺️ | Describe a flow in plain language → auto-generate nodes |

### Messaging & Conversations

| Feature | Status | Notes |
|---------|--------|-------|
| Send all message types via API | ✅ | 14 types supported |
| Conversation inbox (read) | ✅ | |
| Reply from inbox | ✅ | |
| Real-time incoming message push | ❌ | Must refresh manually to see new messages |
| Message search | ✅ | In-memory Baileys message store |
| Pagination on messages/conversations | ❌ | Hard-capped at 200 / 500 records |
| Contact manager | 🗺️ | Planned — tag, search, block / unblock contacts |

### Webhooks

| Feature | Status | Notes |
|---------|--------|-------|
| Inbound webhook trigger | ✅ | `POST /api/webhook/:flowId` |
| Webhook secret validation | ✅ | `x-webhook-secret` header check |
| Variable mappings on trigger | ✅ | Map payload paths to flow variables |
| GET webhook support | ❌ | Some services send GET for handshake; not handled |
| Per-flow rate limiting | ❌ | Only global 300 req/min limiter |
| Webhook retry queue | 🗺️ | Planned — retry failed HTTP Request nodes with backoff |

### Platform — WhatsApp Business Only

| Feature | Status | Notes |
|---------|--------|-------|
| Native message templates | 🏢 | Requires WA Business API approval |
| PIX payment messages | 🏢 | Brazil only; WA Business API |
| WhatsApp Shop / catalog | 🏢 | WA Business API with catalog access |
| LaTeX image rendering | 🗺️ | Requires external image generation service |

---

## Known Issues

These are confirmed bugs in the current codebase. Fixes marked **✅ Fixed** are resolved in the latest commit.

| Issue | Severity | Status |
|-------|----------|--------|
| All active flows fired on every incoming message (no filter) | Critical | ✅ Fixed — keyword filter added |
| Session reconnect looped forever on bad credentials | Critical | ✅ Fixed — exponential backoff, max 5 retries |
| Socket.io connections were unauthenticated (QR/logs leaked) | High | ✅ Fixed — `io.use()` JWT middleware added |
| `saveAutoReplyRules` leaked timers on every save | High | ✅ Fixed — old instances stopped before replacing |
| Prototype pollution via `__proto__` in webhook payloads | Medium | ✅ Fixed — blocked in template engine and webhook controller |
| `ecosystem.config.cjs` hardcoded `PORT: 3000`, broke Railway PM2 mode | Medium | ✅ Fixed — removed hardcoded port |
| `runFlow` accumulates Socket.io listeners on repeated clicks | High | Open |
| Background broadcast loop can call `process.exit(1)` mid-run | High | Open |
| Webhook silently skips secret check on corrupt flow JSON | Medium | Open |
| `connectDB()` `.catch()` in app.js is unreachable dead code | Low | Open |
| Flow activate/deactivate toggle requires manual Save — no auto-save | Low | Open |
| `useSessions` hook never refreshes after mount | Low | Open |
| Messages/conversations hard-capped, no pagination | Low | Open |

> [!TIP]
> To report a new issue, open a [GitHub Issue](https://github.com/zqdevelopers/waai-flow/issues).

---

## Roadmap

### Near Term

- [ ] Keyword / regex filter UI for webhook_trigger node
- [ ] Edit draft broadcasts (`PUT /modules/broadcasts/:id`)
- [ ] Cancel running broadcast
- [ ] Broadcast message type selector (image, buttons, list)
- [ ] Link Agent profiles to Flow Builder AI Chat node
- [ ] Flow delete + duplicate buttons in sidebar
- [ ] Flow export / import as JSON
- [ ] QR code expiry countdown
- [ ] Pagination on messages and conversations

### ⭐ 50-Star Milestone

> These features will be built when this repo reaches **50 GitHub stars**.
> [Star the repo](https://github.com/zqdevelopers/waai-flow/stargazers) to make it happen.

- [ ] **Multi-user support** — team members with role-based access (admin / operator / viewer)
- [ ] **Flow marketplace** — export flows as `.waai.json`, share community templates
- [ ] **AI flow generator** — describe a flow in plain English, get nodes auto-generated
- [ ] **Scheduled broadcasts** — pick a date and time, run automatically
- [ ] **Real-time conversation inbox** — new messages push via Socket.io, unread badge in nav
- [ ] **Per-flow analytics** — trigger count, success rate, node error heatmap on canvas
- [ ] **n8n / Make / Zapier integration** — standardized webhook in/out format
- [ ] **WhatsApp contact manager** — view, search, tag, block / unblock contacts
- [ ] **Docker Compose + Postgres stack** — one-command self-host with durable database
- [ ] **Broadcast analytics** — per-recipient sent / failed / pending tracking

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js 22, Express, Prisma, SQLite |
| WhatsApp | `@innovatorssoft/baileys` |
| Frontend | React 18, Vite, Tailwind CSS, React Flow, Recharts |
| Auth | Custom HMAC-SHA256 JWT (no external dependency) |
| Real-time | Socket.IO |
| Deployment | PM2 or Docker |

---

## Requirements

- Node.js 22+
- npm

---

## Quick Start

```bash
npm run install:all
```

Copy the environment template:

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=replace-with-a-long-random-string
```

Initialize the database:

```bash
cd backend && npx prisma db push && cd ..
```

Start development servers:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

Default login: `admin` / `your-strong-password`

---

## Scripts

```bash
npm run install:all   # Install all dependencies (root + backend + frontend)
npm run dev           # Start dev servers (hot reload)
npm run build         # Build frontend for production
npm run start         # Start both apps with PM2
npm run stop          # Stop PM2 processes
npm run logs          # Tail PM2 logs
```

---

## Production with PM2

```bash
npm run build
npm run start
npm run logs
```

---

## Docker

```bash
docker compose up --build
```

Configure environment variables and persistent volumes for database, sessions, and uploads before deploying publicly.

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

Render free tier does not have a durable filesystem — SQLite data, session files, and uploads are lost on restart. Use a paid service with a persistent disk and set `DATA_PATH` to the disk mount path for a stable instance.

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
4. Click **Run**, then **Publish → Reserved VM**.

Reserved VM is strongly recommended over Autoscale — Autoscale can idle and disconnect WhatsApp sessions.

---

## GitHub Upload Checklist

- [ ] Change `ADMIN_PASSWORD` and `AUTH_SECRET` in your deployed `.env`
- [ ] Replace support WhatsApp number in `README.md` and `SUPPORT.md`
- [ ] Confirm `.env`, `sessions/`, `uploads/`, `node_modules/`, `dist/`, and `*.db` are in `.gitignore`
- [ ] Run `npm run build` before tagging a release

---

## Important Notice

This project uses Baileys for WhatsApp Web automation and is in no way affiliated with or endorsed by WhatsApp Inc. Do not use this project to spam, harass, or scrape. We do not condone use that violates WhatsApp Terms of Service, consent, privacy, or local law. Use responsibly.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
