# WAAI Flow

Open-source WhatsApp AI automation platform — visual flow builder, AI agents, multi-session management, broadcasts, webhooks, and real-time analytics.

**Maintainer:** ZQ Developers &nbsp;|&nbsp; **Support:** +923334916432

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

### Core Automation & Visual Flow Builder

| Feature | Status | Notes |
|---------|--------|-------|
| Visual Flow Builder | ✅ | Interactive drag-and-drop canvas powered by React Flow with 10+ node types |
| Webhook Trigger Node | ✅ | Keyword filter and secret validation UI |
| Send Message Node | ✅ | 14 types: text, image, video, audio, gif, document, location, contacts, sticker, poll, buttons, list, URL buttons, native flow |
| WhatsApp Poll Node | ✅ | Native WhatsApp interactive polls with custom choices and single/multi-selection |
| AI Chat Node | ✅ | Multi-turn contextual memory, multi-provider, direct Agent profile linking |
| Code Execution Node | ✅ | Safe JavaScript code sandbox for custom transformations and calculations |
| Condition Node | ✅ | Dual TRUE/FALSE branching with equality, contains, and inequality operators |
| Delay Node | ✅ | Configurable step delays |
| Set Variable / Text Formatter | ✅ | `{{variable.path}}` template syntax |
| HTTP Request Node | ✅ | REST API integration (GET/POST/PUT/PATCH/DELETE) with `continueOnError` handling |
| AI Flow Generator | ✅ | ✨ Natural language prompt-to-flow generator (`POST /api/flows/generate`) |
| Pre-built Flow Templates | ✅ | Production-ready workflow templates library |
| Flow Import / Export | ✅ | JSON flow export and 1-click import |
| Flow Duplicate / Clone | ✅ | 1-click duplicate workflow with draft status |
| Flow Delete | ✅ | Safe flow deletion with confirmation |

### WhatsApp Sessions & Connectivity

| Feature | Status | Notes |
|---------|--------|-------|
| QR Code Login | ✅ | Dynamic real-time QR generation with 25s visual refresh countdown |
| Pairing Code Login | ✅ | Phone number login without camera — 8-digit pairing code generation |
| Multi-session Support | ✅ | Unlimited simultaneous WhatsApp accounts |
| Session Rename | ✅ | Inline edit & rename session modal |
| Auto-reconnect with Backoff | ✅ | 5 exponential retry attempts with graceful recovery |

### Broadcasts & Campaigns

| Feature | Status | Notes |
|---------|--------|-------|
| Create & Run Broadcast | ✅ | Non-blocking async queue with live progress bar |
| Cancel Running Broadcast | ✅ | Immediate cancellation support (`POST /api/modules/broadcasts/:id/cancel`) |
| Edit Draft Broadcast | ✅ | Update campaign parameters (`PUT /api/modules/broadcasts/:id`) |
| CSV Contact Import | ✅ | 1-click CSV contact list import with auto-validation |
| Broadcast Message Types | ✅ | Text, image, video, document, buttons, list |

### AI Providers & Agents

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI Integration | ✅ | GPT-4o, GPT-4 Turbo |
| Google Gemini Integration | ✅ | Gemini 2.0 Flash / Pro |
| Anthropic Claude Integration | ✅ | Claude 3.5 Sonnet / Haiku |
| DeepSeek Integration | ✅ | DeepSeek V3 / R1 |
| Groq Integration | ✅ | Ultra-fast Llama 3.3 70B |
| Ollama (Local LLM) | ✅ | Local offline models |
| Reusable Agent Profiles | ✅ | Linked directly into Flow Builder AI Chat nodes |

### Messaging & Conversations

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time Inbox Push | ✅ | Live Socket.IO incoming message & conversation stream |
| Voice Note Recording | ✅ | Microphone recording via MediaRecorder API and instant audio send |
| Delivery Status Ticks | ✅ | Sent and delivered indicators |
| Send All Message Types via API | ✅ | 14 types |
| In-memory Message Search | ✅ | Indexed fast text lookup |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express, Prisma, SQLite |
| WhatsApp Engine | `@innovatorssoft/baileys` |
| Frontend | React 18, Vite 8, Tailwind CSS, React Flow (`@xyflow/react`), Recharts |
| Auth | Custom HMAC-SHA256 JWT |
| Real-time | Socket.IO |
| Deployment | Docker, PM2, Railway, Render, Replit |

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

## License

MIT — see [LICENSE](LICENSE).
