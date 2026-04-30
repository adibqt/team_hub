# FredoCloud Technical Assessment — Complete Build Guide

**Project:** Collaborative Team Hub
**Stack:** Turborepo + Next.js 14 (JS) + Tailwind + Zustand + Express + Prisma + PostgreSQL + Socket.io + Cloudinary + Railway
**Budget:** ~14 hours over 3 days
**Chosen advanced features:** Optimistic UI and Audit Log (rationale below)

---

## 0. Strategy and Time Budget

You have 12–16 hours. Treat it like three half-days:

- Day 1 (~5h): Accounts, monorepo, backend skeleton + auth, frontend skeleton + login.
- Day 2 (~6h): Workspaces, Goals, Action Items, Announcements, Cloudinary, Socket.io.
- Day 3 (~4h): Analytics, two advanced features, polish, deploy, README, video.

Resist the urge to gold-plate any single screen. The grader cares about all 7 evaluation buckets, not pixel-perfect Kanban.

### Why Optimistic UI + Audit Log are the easiest two

- **Optimistic UI** is mostly a Zustand pattern: snapshot state, mutate locally, fire the request, rollback on error. No new infrastructure.
- **Audit Log** is one Prisma model, one Express middleware (or service-layer helper), and a paginated table view with the CSV export you're already writing for Analytics. The "immutable" requirement is satisfied by simply not exposing UPDATE/DELETE endpoints.

The other three (collab editing, offline, RBAC matrix) each require significantly more design work or new dependencies (Yjs, service workers, CASL, etc.).

---

## 1. Prerequisites — Accounts and Local Tooling

### Accounts to create (all free tier)

1. **GitHub** — the public repo lives here.
2. **Railway** (`railway.app`) — sign up with GitHub. New users get $5 trial credit, plenty for this assessment.
3. **Cloudinary** (`cloudinary.com`) — free tier, grab `Cloud name`, `API Key`, `API Secret` from the dashboard.
4. (Optional) **Resend** or **Mailtrap** if you tackle the email bonus.

### Local tooling

```bash
node -v          # >= 18.18 (Next.js 14 requirement)
npm -v           # >= 10
git --version
```

Install pnpm (Turborepo's preferred package manager — faster, better hoisting):

```bash
npm install -g pnpm
pnpm -v
```

Install the Railway CLI (lets you pull env vars locally and tail logs):

```bash
npm install -g @railway/cli
railway login
```

You do **not** need PostgreSQL installed locally. Use Railway's Postgres for both dev and prod, or use a Docker one-liner if you want isolation:

```bash
docker run --name hub-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

---

## 2. Monorepo Skeleton (Turborepo)

```bash
mkdir team-hub && cd team-hub
pnpm dlx create-turbo@latest .
# Pick: pnpm, default starter, JavaScript
```

Then strip the starter back to what you actually need. Final layout:

```
team-hub/
├── apps/
│   ├── web/        # Next.js 14
│   └── api/        # Express + Prisma
├── packages/
│   ├── config/     # shared eslint, tailwind preset
│   └── shared/     # shared constants, validators (zod schemas)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .gitignore
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json` (key bit — make sure `dev` is `cache: false, persistent: true` and `build` depends on upstream builds):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  {},
    "db:generate": { "cache": false }
  }
}
```

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "packageManager": "pnpm@9.0.0"
}
```

Initial commit using conventional commits (the brief specifically mentions this — graders check):

```bash
git init
git add .
git commit -m "chore: bootstrap turborepo monorepo"
```

Use this convention throughout: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. One commit per logical chunk, not one giant one.

---

## 3. Backend Skeleton (`apps/api`)

```bash
mkdir -p apps/api && cd apps/api
pnpm init
```

Install everything in one shot:

```bash
pnpm add express cors cookie-parser bcryptjs jsonwebtoken zod \
        socket.io cloudinary multer multer-storage-cloudinary \
        prisma @prisma/client dotenv helmet morgan
pnpm add -D nodemon
```

`apps/api/package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "build": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "node prisma/seed.js"
  }
}
```

### Folder layout

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── server.js              # http + socket.io bootstrap
│   ├── app.js                 # express app
│   ├── config/
│   │   ├── env.js
│   │   ├── prisma.js
│   │   └── cloudinary.js
│   ├── middleware/
│   │   ├── auth.js            # verifies access token from cookie
│   │   ├── error.js
│   │   └── audit.js           # writes audit log entries
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── workspaces.routes.js
│   │   ├── goals.routes.js
│   │   ├── milestones.routes.js
│   │   ├── announcements.routes.js
│   │   ├── actionItems.routes.js
│   │   ├── analytics.routes.js
│   │   └── audit.routes.js
│   ├── controllers/           # thin — call services
│   ├── services/              # business logic
│   ├── sockets/
│   │   └── index.js           # rooms per workspace, presence
│   └── utils/
│       └── tokens.js          # signAccess, signRefresh, verify
└── .env
```

### `prisma/schema.prisma`

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  name         String
  avatarUrl    String?
  createdAt    DateTime @default(now())
  memberships  Membership[]
  ownedGoals   Goal[]   @relation("GoalOwner")
  actionItems  ActionItem[] @relation("Assignee")
  comments     Comment[]
  reactions    Reaction[]
  auditEntries AuditLog[]
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  description String?
  accentColor String   @default("#2563EB")
  createdAt   DateTime @default(now())
  members     Membership[]
  goals       Goal[]
  announcements Announcement[]
  actionItems ActionItem[]
  auditLogs   AuditLog[]
  invites     Invite[]
}

enum Role { ADMIN MEMBER }

model Membership {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  role        Role     @default(MEMBER)
  joinedAt    DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([userId, workspaceId])
}

model Invite {
  id          String   @id @default(cuid())
  email       String
  workspaceId String
  role        Role     @default(MEMBER)
  token       String   @unique
  acceptedAt  DateTime?
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

enum GoalStatus { NOT_STARTED IN_PROGRESS COMPLETED ARCHIVED }

model Goal {
  id           String   @id @default(cuid())
  workspaceId  String
  title        String
  description  String?
  ownerId      String
  dueDate      DateTime?
  status       GoalStatus @default(NOT_STARTED)
  createdAt    DateTime @default(now())
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  owner        User      @relation("GoalOwner", fields: [ownerId], references: [id])
  milestones   Milestone[]
  updates      GoalUpdate[]
  actionItems  ActionItem[]
}

model Milestone {
  id        String  @id @default(cuid())
  goalId    String
  title     String
  progress  Int     @default(0)   // 0–100
  goal      Goal    @relation(fields: [goalId], references: [id], onDelete: Cascade)
}

model GoalUpdate {
  id        String   @id @default(cuid())
  goalId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  goal      Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
}

model Announcement {
  id          String  @id @default(cuid())
  workspaceId String
  authorId    String
  title       String
  bodyHtml    String  // sanitized HTML from rich-text editor
  pinned      Boolean @default(false)
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  comments    Comment[]
  reactions   Reaction[]
}

model Comment {
  id              String  @id @default(cuid())
  announcementId  String
  authorId        String
  body            String
  mentions        String[]   // userIds
  createdAt       DateTime @default(now())
  announcement    Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  author          User @relation(fields: [authorId], references: [id])
}

model Reaction {
  id              String @id @default(cuid())
  announcementId  String
  userId          String
  emoji           String
  announcement    Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  user            User @relation(fields: [userId], references: [id])
  @@unique([announcementId, userId, emoji])
}

enum Priority { LOW MEDIUM HIGH URGENT }
enum ItemStatus { TODO IN_PROGRESS REVIEW DONE }

model ActionItem {
  id          String   @id @default(cuid())
  workspaceId String
  goalId      String?
  title       String
  description String?
  assigneeId  String?
  priority    Priority @default(MEDIUM)
  status      ItemStatus @default(TODO)
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  goal        Goal?     @relation(fields: [goalId], references: [id])
  assignee    User?     @relation("Assignee", fields: [assigneeId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 'mention', 'invite', 'goal_update'
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())
}

// --- Advanced feature: Audit Log ---
model AuditLog {
  id          String   @id @default(cuid())
  workspaceId String
  actorId     String
  action      String   // e.g. 'goal.create', 'announcement.delete'
  entityType  String   // 'Goal' | 'Announcement' | 'ActionItem' | ...
  entityId    String
  diff        Json?    // { before: {...}, after: {...} }
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  actor       User      @relation(fields: [actorId], references: [id])
  @@index([workspaceId, createdAt])
}
```

Run the first migration once `DATABASE_URL` is in `.env`:

```bash
pnpm prisma migrate dev --name init
```

### `src/server.js` — HTTP + Socket.io bootstrap

```js
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { env } from "./config/env.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CLIENT_URL, credentials: true },
});
app.set("io", io);              // expose to controllers
registerSocketHandlers(io);

server.listen(env.PORT, () => console.log(`API on :${env.PORT}`));
```

### `src/app.js`

```js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/api", routes);
app.use(errorHandler);

export default app;
```

---

## 4. Authentication (JWT in httpOnly cookies)

`src/utils/tokens.js`:

```js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signAccess  = (u) => jwt.sign({ sub: u.id }, env.JWT_ACCESS_SECRET,  { expiresIn: "15m" });
export const signRefresh = (u) => jwt.sign({ sub: u.id }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
export const verifyAccess  = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

export const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};
```

`src/routes/auth.routes.js` (sketch):

```js
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { signAccess, signRefresh, verifyRefresh, cookieOpts } from "../utils/tokens.js";

const r = Router();

r.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name } });
  const access = signAccess(user), refresh = signRefresh(user);
  res
    .cookie("access",  access,  { ...cookieOpts, maxAge: 15 * 60 * 1000 })
    .cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 })
    .json({ id: user.id, email: user.email, name: user.name });
});

r.post("/login", async (req, res) => { /* same shape */ });

r.post("/refresh", (req, res) => {
  const { sub } = verifyRefresh(req.cookies.refresh);
  const access = signAccess({ id: sub });
  res.cookie("access", access, { ...cookieOpts, maxAge: 15 * 60 * 1000 }).json({ ok: true });
});

r.post("/logout", (_, res) =>
  res.clearCookie("access", cookieOpts).clearCookie("refresh", cookieOpts).json({ ok: true })
);

export default r;
```

`src/middleware/auth.js`:

```js
import { verifyAccess } from "../utils/tokens.js";

export function requireAuth(req, res, next) {
  try {
    const { sub } = verifyAccess(req.cookies.access);
    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
}
```

> CORS gotcha for cookies in production: the frontend must call the API with `credentials: "include"`, and the backend must set `cors({ origin: CLIENT_URL, credentials: true })` plus `sameSite: 'none'` and `secure: true` on cookies.

---

## 5. Frontend Skeleton (`apps/web`)

```bash
cd apps && pnpm create next-app@latest web --js --tailwind --app --eslint --src-dir --import-alias "@/*"
cd web
pnpm add zustand axios socket.io-client recharts lucide-react clsx \
        @tiptap/react @tiptap/starter-kit react-hot-toast date-fns
```

### Folder layout

```
apps/web/src/
├── app/
│   ├── (auth)/login/page.jsx
│   ├── (auth)/register/page.jsx
│   ├── (app)/layout.jsx                 # protected shell
│   ├── (app)/dashboard/page.jsx
│   ├── (app)/w/[workspaceId]/page.jsx
│   ├── (app)/w/[workspaceId]/goals/page.jsx
│   ├── (app)/w/[workspaceId]/announcements/page.jsx
│   ├── (app)/w/[workspaceId]/items/page.jsx
│   ├── (app)/w/[workspaceId]/audit/page.jsx
│   └── layout.jsx
├── components/
│   ├── ui/                              # Button, Input, Modal, Avatar
│   ├── kanban/
│   ├── goals/
│   └── editor/                          # Tiptap wrapper
├── lib/
│   ├── api.js                           # axios instance
│   ├── socket.js                        # singleton socket
│   └── format.js
├── stores/
│   ├── authStore.js
│   ├── workspaceStore.js
│   ├── goalsStore.js
│   ├── itemsStore.js
│   └── presenceStore.js
└── styles/
```

### `src/lib/api.js`

```js
import axios from "axios";
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,                 // sends httpOnly cookies
});

// silent refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retried) {
      err.config._retried = true;
      await api.post("/api/auth/refresh");
      return api(err.config);
    }
    return Promise.reject(err);
  }
);
export default api;
```

### Protected shell — `app/(app)/layout.jsx`

```jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

export default function AppLayout({ children }) {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api.get("/api/users/me")
      .then(({ data }) => setUser(data))
      .catch(() => router.replace("/login"));
  }, []);

  if (!user) return <div className="p-8">Loading…</div>;
  return <div className="flex">{/* sidebar + workspace switcher */}{children}</div>;
}
```

### Zustand store template

```js
// stores/goalsStore.js
import { create } from "zustand";
import api from "@/lib/api";

export const useGoalsStore = create((set, get) => ({
  goals: [],
  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/goals`);
    set({ goals: data });
  },
  // optimistic create — see Section 12
}));
```

---

## 6. Workspaces

Backend routes:

- `POST /api/workspaces` — create; creator becomes ADMIN.
- `GET /api/workspaces` — list mine.
- `GET /api/workspaces/:id` — details + members.
- `POST /api/workspaces/:id/invites` — admin only; create `Invite` row, return token.
- `POST /api/invites/:token/accept` — auth required; create membership.

Frontend: a sidebar dropdown to switch active workspace. Persist `activeWorkspaceId` in `workspaceStore` and in `localStorage`.

> Skip sending real invitation emails unless you tackle the email bonus. Just show the invite link in a modal and let the inviter copy it. Document this in the README under "Known limitations."

---

## 7. Goals & Milestones

- `POST /api/workspaces/:id/goals` — title, ownerId, dueDate, status.
- `GET /api/workspaces/:id/goals` — paginated list.
- `POST /api/goals/:id/milestones` — title, progress.
- `PATCH /api/milestones/:id` — update progress (0–100).
- `POST /api/goals/:id/updates` — append a progress note (activity feed).
- Emit a Socket.io `goal:updated` event into the workspace room on every mutation.

Frontend: a goal detail page with a header (title, owner, due, status pill), a milestones list with inline progress sliders, and an activity feed below.

---

## 8. Announcements

- Use **Tiptap** for the rich-text editor (`@tiptap/react @tiptap/starter-kit`). Sanitize HTML server-side with `sanitize-html` before persisting.
- `POST /api/workspaces/:id/announcements` — admin only.
- `POST /api/announcements/:id/reactions` — toggle emoji.
- `POST /api/announcements/:id/comments` — body, parsed mentions.
- `PATCH /api/announcements/:id/pin` — admin only.

When a comment includes `@username`, parse the `mentions` array server-side, insert `Notification` rows for each mentioned user, and emit `notification:new` over Socket.io to those users' personal rooms.

---

## 9. Action Items + Kanban

Schema is already in place. The Kanban view is four columns (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`).

For drag-and-drop, the lightest option is `@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`):

```bash
pnpm add @hello-pangea/dnd
```

On drop, optimistically update the column locally, then `PATCH /api/items/:id { status }`. If it fails, rollback (this directly satisfies the Optimistic UI advanced feature — see Section 12).

A "List view" toggle just renders the same data as a table.

---

## 10. Real-time with Socket.io

`src/sockets/index.js`:

```js
import { verifyAccess } from "../utils/tokens.js";
import cookie from "cookie";
import { prisma } from "../config/prisma.js";

const presence = new Map(); // workspaceId -> Set<userId>

export function registerSocketHandlers(io) {
  // auth from httpOnly cookie on the upgrade request
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    try {
      const { sub } = verifyAccess(cookies.access);
      socket.userId = sub;
      next();
    } catch { next(new Error("unauthenticated")); }
  });

  io.on("connection", (socket) => {
    socket.on("workspace:join", async (workspaceId) => {
      const member = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: socket.userId, workspaceId } },
      });
      if (!member) return;
      socket.join(`ws:${workspaceId}`);
      socket.join(`user:${socket.userId}`);
      if (!presence.has(workspaceId)) presence.set(workspaceId, new Set());
      presence.get(workspaceId).add(socket.userId);
      io.to(`ws:${workspaceId}`).emit("presence:update", [...presence.get(workspaceId)]);

      socket.on("disconnect", () => {
        presence.get(workspaceId)?.delete(socket.userId);
        io.to(`ws:${workspaceId}`).emit("presence:update", [...(presence.get(workspaceId) || [])]);
      });
    });
  });
}
```

In any controller, broadcast like:

```js
const io = req.app.get("io");
io.to(`ws:${workspaceId}`).emit("goal:created", goal);
```

Frontend `src/lib/socket.js`:

```js
import { io } from "socket.io-client";
let socket;
export const getSocket = () => socket ??= io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket"],
});
```

In each workspace page:

```jsx
useEffect(() => {
  const s = getSocket();
  s.emit("workspace:join", workspaceId);
  s.on("goal:created", (g) => useGoalsStore.getState().pushGoal(g));
  s.on("presence:update", (ids) => usePresenceStore.setState({ online: ids }));
  return () => { s.off("goal:created"); s.off("presence:update"); };
}, [workspaceId]);
```

---

## 11. Cloudinary uploads

`src/config/cloudinary.js`:

```js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "team-hub", allowed_formats: ["jpg", "png", "webp", "pdf"] },
});

export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
```

Usage: `r.post("/me/avatar", requireAuth, upload.single("file"), handler)` — `req.file.path` is the Cloudinary URL to save on the user.

---

## 12. Advanced Feature 1 — Optimistic UI

The pattern, applied everywhere a user creates/updates/moves something:

```js
// stores/itemsStore.js
import { create } from "zustand";
import api from "@/lib/api";
import toast from "react-hot-toast";

export const useItemsStore = create((set, get) => ({
  items: [],

  moveItem: async (id, newStatus) => {
    const prev = get().items;
    // 1. snapshot + optimistic update
    set({ items: prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)) });
    try {
      // 2. fire and forget (await for error capture only)
      await api.patch(`/api/items/${id}`, { status: newStatus });
    } catch (e) {
      // 3. rollback
      set({ items: prev });
      toast.error("Couldn't move item — reverted.");
    }
  },

  createItem: async (draft) => {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic = { ...draft, id: tempId, _pending: true };
    set({ items: [optimistic, ...get().items] });
    try {
      const { data } = await api.post(`/api/workspaces/${draft.workspaceId}/items`, draft);
      // swap temp for real
      set({ items: get().items.map((i) => (i.id === tempId ? data : i)) });
    } catch {
      set({ items: get().items.filter((i) => i.id !== tempId) });
      toast.error("Create failed — please retry.");
    }
  },
}));
```

UI conventions to make it visible to graders:

- Render `_pending` items at slightly reduced opacity (`opacity-60`).
- Toasts for both success and rollback.
- Apply this same shape to: create goal, change goal status, add reaction, pin announcement, drag Kanban card.

In the README, list every screen where optimistic updates are active and screenshot one mid-rollback — that demonstrates the "graceful" requirement.

---

## 13. Advanced Feature 2 — Audit Log

Schema is already in `schema.prisma` (Section 3). Three pieces wire it together.

**(a) Service helper** — `src/services/audit.js`:

```js
import { prisma } from "../config/prisma.js";

export async function logAudit({ workspaceId, actorId, action, entity, before, after }) {
  return prisma.auditLog.create({
    data: {
      workspaceId, actorId, action,
      entityType: entity.type,
      entityId: entity.id,
      diff: before || after ? { before, after } : null,
    },
  });
}
```

**(b) Call it from every mutation controller**, e.g. inside `createGoal`:

```js
const goal = await prisma.goal.create({ data });
await logAudit({
  workspaceId: data.workspaceId,
  actorId: req.userId,
  action: "goal.create",
  entity: { type: "Goal", id: goal.id },
  after: goal,
});
```

For updates, fetch the row first, then pass `before` and `after`. For deletes, pass `before` only.

**(c) Read API + CSV export** — `src/routes/audit.routes.js`:

```js
r.get("/workspaces/:id/audit", requireAuth, requireMember, async (req, res) => {
  const { actorId, action, from, to, page = 1, take = 50 } = req.query;
  const where = {
    workspaceId: req.params.id,
    ...(actorId && { actorId }),
    ...(action  && { action: { contains: action } }),
    ...(from || to ? { createdAt: { gte: from && new Date(from), lte: to && new Date(to) } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * take, take: Number(take),
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ rows, total });
});

r.get("/workspaces/:id/audit.csv", requireAuth, requireMember, async (req, res) => {
  const rows = await prisma.auditLog.findMany({
    where: { workspaceId: req.params.id }, orderBy: { createdAt: "desc" },
    include: { actor: true },
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=audit-${req.params.id}.csv`);
  res.write("createdAt,actor,action,entityType,entityId\n");
  rows.forEach((r) =>
    res.write(`${r.createdAt.toISOString()},${r.actor.email},${r.action},${r.entityType},${r.entityId}\n`)
  );
  res.end();
});
```

Frontend `audit/page.jsx`: a filter bar (actor dropdown, action text input, date range), a paginated table, and a "Download CSV" button that hits the `.csv` endpoint.

The "immutable" requirement is satisfied because no controller exposes update or delete on `AuditLog`. Mention this explicitly in the README.

You can reuse the same CSV-stream pattern for the workspace data export the Analytics section requires — write that helper once, call it twice.

---

## 14. Analytics

- `GET /api/workspaces/:id/analytics/summary` returns `{ totalGoals, completedThisWeek, overdueCount }`.
- `GET /api/workspaces/:id/analytics/completion` returns `[{ week: "2026-W17", completed: 3 }, …]` for the last 8 weeks.
- `GET /api/workspaces/:id/export.csv` streams workspace data (goals, items).

Frontend dashboard: three stat cards across the top, a Recharts `<LineChart>` below for completion, and a "Download CSV" button.

---

## 15. Polish Checklist (don't skip — UI/UX is 15 pts)

- Tailwind with a single accent color from the workspace (read `accentColor` from store).
- Empty states for every list (no goals yet, no announcements yet).
- Loading skeletons (`animate-pulse` divs) on first render.
- Mobile responsive: sidebar collapses to a top bar under `md:`.
- A `<Toaster />` from `react-hot-toast` mounted at the root.
- Form validation with Zod schemas shared in `packages/shared`.
- Keyboard focus rings, `aria-label` on icon buttons.
- Favicon + page titles per route.

> Tests, dark mode, ⌘K palette, and Swagger docs are bonus points. If you have leftover time, OpenAPI via `swagger-jsdoc + swagger-ui-express` is the cheapest +5 — the comments live next to the routes anyway.

---

## 16. Deployment to Railway

### One project, three services

1. In Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick your monorepo.
2. Railway will detect it's a monorepo. Add **two** services from the same repo:
   - **api** — root directory: `apps/api`
   - **web** — root directory: `apps/web`
3. Add a **PostgreSQL** plugin to the project. Railway sets `DATABASE_URL` on the project; reference it from the `api` service via `${{Postgres.DATABASE_URL}}`.

### `apps/api` settings on Railway

- **Root directory:** `apps/api`
- **Build command:** `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm prisma migrate deploy`
- **Start command:** `pnpm start`
- **Environment variables:**

```
NODE_ENV=production
PORT=8080
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=https://<your-web>.up.railway.app
```

### `apps/web` settings on Railway

- **Root directory:** `apps/web`
- **Build command:** `pnpm install --frozen-lockfile && pnpm build`
- **Start command:** `pnpm start`
- **Environment variables:**

```
NEXT_PUBLIC_API_URL=https://<your-api>.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://<your-api>.up.railway.app
```

### The chicken-and-egg URL problem

You need the `web` URL inside `CLIENT_URL` on the api, and the `api` URL inside `NEXT_PUBLIC_API_URL` on the web. Workflow:

1. Deploy both with placeholder values.
2. Click **Generate Domain** on each service to get a URL.
3. Update each service's env vars with the real URLs.
4. Trigger redeploys (Railway does this automatically on env var change).

### Cookie/CORS in production

Because the two domains differ (`web.up.railway.app` vs `api.up.railway.app`), the cookie must be `SameSite=None; Secure`. Already handled in `cookieOpts` (Section 4) when `NODE_ENV === "production"`.

### Seed a demo account

`prisma/seed.js` creates `demo@fredocloud.dev / Demo1234!` with one workspace, two goals, and a few action items. Run it once after the first deploy:

```bash
railway run --service api pnpm db:seed
```

Put these credentials in the README so the grader can log in instantly.

### Turborepo and Railway: build performance

Turborepo's remote cache is unnecessary for this — Railway builds each service from its own root directory. If builds are slow, set the `Watch Paths` for the api service to `apps/api/**` and `packages/**`, and the web service to `apps/web/**` and `packages/**`. That avoids redeploying both services on every commit.

---

## 17. Submission Checklist

- [ ] **Live URLs** — both services responding; `/health` returns 200; demo login works.
- [ ] **GitHub repo** — public, ~30+ conventional commits, no secrets committed (`.env` gitignored).
- [ ] **README.md** covers:
  - One-paragraph project overview
  - Architecture diagram (a screenshot of a quick draw.io or excalidraw is fine)
  - Local setup (clone, `pnpm install`, copy `.env.example`, `pnpm prisma migrate dev`, `pnpm dev`)
  - Full env variable reference table
  - **Chosen advanced features: Optimistic UI and Audit Log** — one paragraph each on what's implemented and where to see it
  - Demo credentials
  - Known limitations (e.g. "invites are link-based, not emailed")
  - Deployment notes
- [ ] **Video** — 3–5 min, 1080p, screen + voice. Suggested script:
  - 0:00 Login with demo account
  - 0:30 Workspace switcher + invite flow
  - 1:00 Create a goal with milestones
  - 1:30 Open a second tab as another user → see real-time goal appear, presence dot
  - 2:00 Kanban drag with optimistic update, then trigger an error to show rollback
  - 2:45 Announcement with mention, comment, reaction, pin
  - 3:15 Audit log: filter by actor, download CSV, open the CSV
  - 3:45 Analytics dashboard
  - 4:15 Mention deployment, Railway dashboard
  - Tools: Loom (free 5 min cap fits perfectly) or OBS.
- [ ] Email `hiring@fredocloud.com` with subject `[Technical Assessment]` and links to repo, two URLs, video, and demo creds.

---

## 18. Common Pitfalls (avoid these)

- **Cookies not set in browser** — `withCredentials: true` on axios AND `credentials: true` on cors AND `sameSite: 'none'; secure: true` cookies in prod. All three or none work.
- **Prisma migrations on Railway fail** — happens when the build runs before `DATABASE_URL` is wired. Make sure you added the Postgres plugin first, then redeployed the api service.
- **Socket.io 400 on upgrade** — usually the same CORS issue. Set `cors: { origin: CLIENT_URL, credentials: true }` on the `Server` constructor too, not just on Express.
- **Next.js 14 `cookies()` confusion** — you don't need it; this app's auth is client-side via axios with `withCredentials`. Reserve server components for static content only.
- **Turborepo not picking up changes** — `dev` task must be `cache: false, persistent: true`.
- **Cloudinary upload fails on Railway** — multer's memory storage hits Railway's request size limit. The `multer-storage-cloudinary` setup in Section 11 streams direct to Cloudinary, avoiding the issue.
- **Free Cloudinary upload preset** — if you skip multer-storage-cloudinary and upload directly from the browser, create an unsigned upload preset in the Cloudinary dashboard first.
- **Conventional commits** — use a tool like `commitlint` locally, or just be disciplined. `feat(auth): add refresh token rotation` reads better than `update auth`.

---

## 19. Suggested Day-by-Day Schedule

**Day 1 (~5h)**
- 0:30 Accounts, repo, Turborepo
- 1:00 Backend skeleton, Prisma schema, first migration
- 1:30 Auth endpoints + cookies + middleware
- 1:00 Frontend skeleton, login/register pages, protected layout
- 1:00 Workspaces (create, list, switch, invite link)

**Day 2 (~6h)**
- 1:30 Goals + milestones + activity feed
- 1:00 Action items + Kanban (with optimistic moves — feature 1 in flight)
- 1:00 Announcements with Tiptap + reactions + comments + mentions
- 1:00 Cloudinary avatars
- 1:30 Socket.io: room join, presence, broadcast on mutations

**Day 3 (~4h)**
- 0:45 Analytics dashboard + CSV export
- 1:00 Audit log (feature 2): middleware, list view, CSV
- 0:45 Polish: empty states, skeletons, mobile, toasts
- 1:00 Deploy both services on Railway, fix CORS/cookies
- 0:30 README, video recording, submission email

You'll be over the 16-hour ceiling if you tackle bonuses. Skip them unless you finish the core early — graders weight the 100-point rubric far more than +10 bonus.

---

Good luck. The hardest parts are the cookie/CORS triangle in production and resisting scope creep on the UI. If both services are talking and a grader can log in with the demo account, you're already at ~70 points.
