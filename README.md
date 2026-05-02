# Team Hub

A collaborative team hub where teams manage shared **goals**, post **announcements**, and track **action items** in real time. Built as a Turborepo monorepo with a Next.js 14 frontend and an Express + Prisma backend, deployed on Railway.


---

## Project Overview

Team Hub gives a small team a single workspace to:

- **Authenticate** with email/password — JWT access + refresh tokens stored in httpOnly cookies, with silent refresh on 401.
- **Create and switch workspaces** — each with a name, description, accent colour, and Admin/Member roles.
- **Invite members** by email — invitations are sent via SMTP (Nodemailer) with a styled HTML template; the recipient clicks through to accept and is auto-redeemed on first sign-in.
- **Track goals & milestones** — title, owner, due date, status, nested milestones with 0–100% progress, and an activity feed of progress updates.
- **Publish announcements** with a Tiptap rich-text editor; sanitised server-side; pin to top; emoji reactions and threaded comments with `@mentions`.
- **Manage action items** on a Kanban board (`TODO / IN_PROGRESS / REVIEW / DONE`) with drag-and-drop, plus a list-view toggle, priority, due date, and optional link to a parent goal.
- **Real-time updates** — Socket.io rooms per workspace push new goals, status changes, reactions, and comments live; presence shows online members; `@mention` triggers an in-app notification.
- **Analytics** — dashboard cards (total goals, completed this week, overdue), a Recharts completion chart, and CSV export of workspace data.
- **Audit log** — every workspace mutation written to an immutable log with a filterable timeline UI and CSV export.

### Tech Stack

| Area          | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| Monorepo      | Turborepo + pnpm workspaces                                 |
| Frontend      | Next.js 14 (App Router, JavaScript), Tailwind CSS, Zustand  |
| Rich text     | Tiptap                                                      |
| Charts        | Recharts                                                    |
| Drag & drop   | @hello-pangea/dnd                                           |
| Backend       | Node.js + Express.js (REST)                                 |
| Database      | PostgreSQL + Prisma ORM                                     |
| Auth          | JWT access + refresh in httpOnly cookies                    |
| Real-time     | Socket.io                                                   |
| File storage  | Cloudinary (avatars & attachments) via `multer-storage-cloudinary` |
| Tests         | Jest + Supertest (API), React Testing Library (web)         |
| API docs      | Swagger UI at `/api/docs` (OpenAPI generated from JSDoc)    |
| Deployment    | Railway (frontend & backend as separate services)           |

### Repository Layout

```
team_hub/
├── apps/
│   ├── api/           # Express + Prisma + Socket.io
│   │   ├── prisma/    # schema.prisma, migrations, seed.js
│   │   └── src/
│   │       ├── routes/        # auth, users, workspaces, goals, milestones,
│   │       │                  # announcements, actionItems, analytics, audit, notifications
│   │       ├── controllers/   # thin handlers
│   │       ├── services/      # business logic + audit helper
│   │       ├── middleware/    # auth, error, audit
│   │       ├── sockets/       # presence + per-workspace rooms
│   │       └── config/        # env, prisma, cloudinary
│   └── web/           # Next.js 14 (App Router, JS)
│       └── src/
│           ├── app/
│           │   ├── (auth)/login, register
│           │   ├── (app)/dashboard, profile
│           │   └── (app)/w/[workspaceId]/{goals,announcements,items,members,analytics,audit,settings}
│           ├── components/    # ui, kanban, goals, announcements, editor, workspaces
│           ├── stores/        # zustand: auth, workspace, goals, items, announcements, presence, notifications, theme
│           └── lib/           # axios + socket singletons
├── packages/
│   ├── config/        # shared eslint/tailwind preset
│   └── shared/        # shared zod schemas + constants
├── turbo.json
├── pnpm-workspace.yaml
└── docker-compose.yml # optional local Postgres
```

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18.18
- **pnpm** ≥ 9 — `npm install -g pnpm`
- **PostgreSQL 16** — either locally, via Docker (`docker compose up -d`), or a Railway-provisioned URL
- A free **Cloudinary** account (only needed if you want avatar uploads working)

### 1. Clone & install

```bash
git clone <repo-url> team_hub
cd team_hub
pnpm install
```

### 2. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
# create apps/web/.env.local — see "Environment Variables" below
```

Fill in `DATABASE_URL`, the two JWT secrets, and (optionally) Cloudinary keys in `apps/api/.env`. See the table below for the full list.

### 3. Start a local Postgres (skip if you already have one)

```bash
docker compose up -d            # starts postgres on :5432
# OR
docker run --name hub-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

### 4. Migrate and seed the database

```bash
cd apps/api
pnpm prisma migrate dev         # applies migrations
pnpm db:seed                    # creates the demo account
cd ../..
```

### 5. Run the dev servers

```bash
pnpm dev                        # turbo runs both apps in parallel
```

- Web → http://localhost:3000
- API → http://localhost:8080
- Swagger → http://localhost:8080/api/docs

### Demo credentials

```
Email:    demo@fredocloud.dev
Password: Demo1234!
```

### Other useful scripts

```bash
pnpm build                      # builds both apps (turbo)
pnpm lint                       # lint both apps
pnpm test                       # run all Jest suites
pnpm test:coverage              # collect coverage
pnpm --filter api db:migrate    # create a new migration
pnpm --filter api db:deploy     # apply migrations in production
```

---

## Environment Variables

### Backend — `apps/api/.env`

| Variable                | Required | Example / Default                                 | Notes                                                                              |
| ----------------------- | :------: | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `NODE_ENV`              |    ✓     | `development`                                     | `production` switches cookies to `SameSite=None; Secure`.                          |
| `PORT`                  |    ✓     | `8080`                                            | Railway injects this in production.                                                |
| `DATABASE_URL`          |    ✓     | `postgresql://postgres:dev@localhost:5432/teamhub`| On Railway: `${{Postgres.DATABASE_URL}}`.                                          |
| `JWT_ACCESS_SECRET`     |    ✓     | random 48-byte string                             | Generate with `openssl rand -base64 48`.                                           |
| `JWT_REFRESH_SECRET`    |    ✓     | random 48-byte string                             | Must differ from access secret.                                                    |
| `CLIENT_URL`            |    ✓     | `http://localhost:3000`                           | Used by CORS and Socket.io origin. Set to the deployed web URL in production.      |
| `CLOUDINARY_CLOUD_NAME` |    —     | —                                                 | Required only if avatar/attachment uploads are used.                               |
| `CLOUDINARY_API_KEY`    |    —     | —                                                 | Same.                                                                              |
| `CLOUDINARY_API_SECRET` |    —     | —                                                 | Same.                                                                              |
| `BREVO_API_KEY`         |    —     | `xkeysib-...`                                     | **Used in production.** When set, the mailer sends through Brevo's HTTP API (required on Railway — see notes below) and the `SMTP_*` vars are ignored. |
| `SMTP_HOST`             |    —     | `smtp.gmail.com`                                  | Local-dev fallback (Nodemailer). If neither Brevo nor SMTP is configured, invite still creates a link and the email step is skipped with a console warning. |
| `SMTP_PORT`             |    —     | `587`                                             | `465` for TLS, `587`/`2525` for STARTTLS.                                          |
| `SMTP_SECURE`           |    —     | `false`                                           | `true` only for port 465.                                                          |
| `SMTP_USER`             |    —     | —                                                 | SMTP username / API key.                                                           |
| `SMTP_PASS`             |    —     | —                                                 | SMTP password / API secret.                                                        |
| `MAIL_FROM`             |    —     | `noreply@yourdomain.com`                          | Sender address. Required when using Brevo; defaults to `SMTP_USER` for the SMTP path. Must match a verified Brevo sender. |
| `MAIL_FROM_NAME`        |    —     | `Team Hub`                                        | Display name on the `From:` header.                                                |

### Frontend — `apps/web/.env.local`

| Variable                  | Required | Example / Default                  | Notes                                            |
| ------------------------- | :------: | ---------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`     |    ✓     | `http://localhost:8080`            | Base URL for the Express API.                    |
| `NEXT_PUBLIC_SOCKET_URL`  |    ✓     | `http://localhost:8080`            | Usually the same host as the API.                |

> **Production cookie/CORS triangle.** When the web and API are on different domains, all three must align: axios `withCredentials: true`, `cors({ origin: CLIENT_URL, credentials: true })`, and cookies set with `SameSite=None; Secure`. The cookie helper handles this automatically when `NODE_ENV === "production"`.

---

## Advanced Features Built

The brief asks for two advanced features; **three** are implemented (Optimistic UI, Audit Log, and Offline Support).

### 1. Optimistic UI

Every create/update/move action reflects in the UI **immediately**, with a graceful rollback if the server rejects it.

- Implemented as a Zustand pattern: snapshot → optimistic mutation → request → swap-or-rollback.
- Rolled-back states show a `react-hot-toast` error; pending rows render at reduced opacity until the server confirms and the temp id is swapped for the real one.
- Active across:
  - Kanban drag-and-drop (`apps/web/src/stores/itemsStore.js` — `moveItem`)
  - Action-item create
  - Goal create / status change
  - Announcement reactions and pin toggle
  - Comment posting

### 2. Audit Log

Every workspace mutation is appended to an **immutable** log, exposed via a filterable timeline and CSV export.

- Schema: `AuditLog` model in `apps/api/prisma/schema.prisma` (action, entityType, entityId, diff, actorId, workspaceId, createdAt).
- Helper: `apps/api/src/services/audit.js` (`logAudit`) called from every mutation controller; for updates the row is fetched first so `{ before, after }` can be diffed.
- Read API: `GET /api/workspaces/:id/audit` with `actorId`, `action`, `from`, `to`, pagination.
- CSV export: `GET /api/workspaces/:id/audit.csv` streams rows.
- UI: `apps/web/src/app/(app)/w/[workspaceId]/audit/page.jsx` — filter bar (actor, action, date range), paginated table, "Download CSV" button.
- **Immutability** is enforced by simply not exposing UPDATE or DELETE endpoints on `AuditLog` — there is no controller path to mutate a row once written.

### 3. Offline Support

The web app stays usable when the network drops: GET responses are cached, mutations are queued locally, and the queue replays automatically on reconnect.

- Implementation: `apps/web/src/lib/offline.js` — pure JS, `localStorage`-backed (no service worker required), wired into the axios instance via interceptors.
- **Read cache** — successful `GET` responses are written to `th_offline_cache_v1`; while offline, the same request is served from cache so list/detail pages still render.
- **Write queue** — `POST` / `PATCH` / `DELETE` requests that fail with a network error are appended to `th_offline_queue_v1` and a synthetic `202 Queued` response is returned, so the existing optimistic UI keeps its state without rolling back.
- **Replay on reconnect** — `window` `online` event triggers `replayQueue()`, which drains the queue in order and emits `offline:idmap` events so stores can swap optimistic `tmp_*` ids for the canonical ids returned by the server. `tmp_*` ids embedded in later URLs/bodies are rewritten on the fly, so a "create then update" sequence performed offline replays correctly.
- **UI surface** — `OfflineBanner` component shows offline status and queued-write count; failed replays surface via the `offline:replay-failed` event for a toast.
- The runtime is initialised once per session via `initOfflineRuntime(api)` against the shared axios instance.

### Bonus features also implemented

- **Dark / light theme** with system-preference detection (`themeStore.js`, `ThemeProvider`, `ThemeScript`, `ThemeToggle`).
- **Email notifications** — invitation emails and mentions sent from `apps/api/src/services/mailer.js` with a fully styled HTML template. The mailer has two backends and picks one at runtime:
  - **Brevo HTTP API** (production on Railway) — used when `BREVO_API_KEY` is set. Railway blocks outbound SMTP ports (25 / 465 / 587), so direct Gmail SMTP via Nodemailer is unreachable from the deployed API; Brevo's HTTPS API sidesteps that entirely. Free tier covers 300 sends/day, which is plenty for this project.
  - **Nodemailer + SMTP** (local dev fallback) — used when `BREVO_API_KEY` is empty but `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are set.
  - **No-op** — if neither is configured, invite creation still succeeds and the link is shown to the inviter; only the email send is skipped, with a console warning. Keeps local dev frictionless.
- **Swagger / OpenAPI** docs served at `/api/docs`, generated from JSDoc on the route files (`swagger-jsdoc` + `swagger-ui-express`).
- **Unit & integration tests** — Jest + Supertest on the API (`apps/api/src/**/__tests__`), React Testing Library on the web (`apps/web/src/**/__tests__`). Run with `pnpm test` or `pnpm test:coverage`.

---

## Deployment (Railway)

Both apps deploy as separate services inside a single Railway project, sharing a PostgreSQL plugin that injects `DATABASE_URL` automatically. Each app ships its own `railway.json` (`apps/api/railway.json`, `apps/web/railway.json`) so build/start commands and the API healthcheck are version-controlled — Railway picks them up when each service's **Root Directory** is set to that subfolder.

**Quick reference**

| Service | Root Directory | Build | Start |
| --- | --- | --- | --- |
| `api`  | `apps/api`     | `corepack enable && pnpm install --frozen-lockfile && pnpm prisma generate` | `pnpm prisma migrate deploy && node src/server.js` |
| `web`  | `apps/web`     | `corepack enable && pnpm install --frozen-lockfile && pnpm build`           | `pnpm start` |
| `Postgres` | (plugin)   | — | — |

The `api` service references the database with `DATABASE_URL=${{Postgres.DATABASE_URL}}` and the `web` service points `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` at the API's public domain.

**Full step-by-step instructions, env var reference, custom domains, and troubleshooting** live in **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Read it before your first deploy — it covers the production cookie/CORS triangle, the `NEXT_PUBLIC_*` rebuild gotcha, and the Prisma migration prerequisite that catches most people.

Seed the demo account once both services are live:

```bash
railway run --service api pnpm db:seed
```

---

## Known Limitations

- **Invitation emails require a configured mail backend.** Production uses **Brevo** (`BREVO_API_KEY`) because Railway blocks outbound SMTP ports, so Nodemailer pointed at Gmail SMTP cannot connect from a deployed service. Local dev can use either Brevo or plain SMTP. If neither is configured, the invite row is still created and the link is shown in the inviter's modal, but no email is sent (a console warning is logged) — local dev stays frictionless.
- **Avatar uploads require Cloudinary credentials.** Without them, avatar upload returns 500; the rest of the app works fine and falls back to initials.

- **Real-time collaborative editing on goal descriptions is not implemented.** Three advanced features were built (Optimistic UI, Audit Log, Offline Support); live multi-cursor editing would have required Yjs or similar.
- **Offline support uses `localStorage`, not IndexedDB or a service worker.** The 5–10MB quota is plenty for the demo dataset, but a production rollout would move to IndexedDB and add a service worker for asset offline-shell. There is also no conflict resolution beyond "drop the queued entry if a dependent `tmp_*` id never resolved" and "drop on 4xx from the server" — last-write-wins.


---

## License

Submitted for evaluation only.
