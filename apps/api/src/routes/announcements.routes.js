import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { prisma } from "../config/prisma.js";
import {
  requireAuth,
  requireMember,
  requireAdmin,
} from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { sendMentionEmail } from "../services/mailer.js";

const r = Router();

/* ─────────────────────────────────────────────
   Rich-text sanitisation
   ─────────────────────────────────────────────
   Editor produces standard HTML from TipTap's StarterKit. We allow the
   semantic subset needed for an announcement (headings, lists, quotes,
   inline emphasis, code, links) and strip everything else. URLs are
   restricted to safe schemes and links always carry rel/target so an
   admin can never publish content that hijacks a member's session.
*/
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4",
  "strong", "em", "u", "s",
  "blockquote",
  "ul", "ol", "li",
  "code", "pre",
  "a",
];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }),
  },
};

function cleanHtml(input = "") {
  return sanitizeHtml(String(input), SANITIZE_OPTIONS).trim();
}

// HTML must contain *some* visible content after sanitisation. TipTap
// emits "<p></p>" for an empty doc, which would otherwise pass.
function hasContent(html) {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

const AUTHOR_FIELDS = { id: true, name: true, avatarUrl: true };

/* The Announcement model doesn't declare a Prisma relation to User
   (only an `authorId` column), so we hydrate authors with a single
   secondary query and merge before responding. */
async function attachAuthor(announcement) {
  if (!announcement) return announcement;
  const author = await prisma.user.findUnique({
    where: { id: announcement.authorId },
    select: AUTHOR_FIELDS,
  });
  return { ...announcement, author };
}

async function attachAuthors(list) {
  if (!list?.length) return list;
  const ids = [...new Set(list.map((a) => a.authorId))];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: AUTHOR_FIELDS,
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return list.map((a) => ({ ...a, author: byId.get(a.authorId) || null }));
}

async function loadAnnouncementForFeed(id) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      comments: {
        include: {
          author: { select: AUTHOR_FIELDS },
        },
        orderBy: { createdAt: "asc" },
      },
      reactions: true,
    },
  });
  return attachAuthor(announcement);
}

async function loadForMember(req, res) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: req.params.id },
  });
  if (!announcement) {
    res.status(404).json({ error: "Announcement not found" });
    return null;
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.userId,
        workspaceId: announcement.workspaceId,
      },
    },
  });
  if (!membership) {
    res.status(403).json({ error: "Not a member of this workspace" });
    return null;
  }
  return announcement;
}

// Resolve an announcement and verify the caller's membership/role for
// routes mounted at /announcements/:id (where wsId isn't in the path).
async function loadForAdmin(req, res) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: req.params.id },
  });
  if (!announcement) {
    res.status(404).json({ error: "Announcement not found" });
    return null;
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.userId,
        workspaceId: announcement.workspaceId,
      },
    },
  });
  if (!membership) {
    res.status(403).json({ error: "Not a member of this workspace" });
    return null;
  }
  if (membership.role !== "ADMIN") {
    res.status(403).json({ error: "Admin role required" });
    return null;
  }
  return announcement;
}

/* ─────────────────────────────────────────────
   CREATE — admin only
   ───────────────────────────────────────────── */

r.post(
  "/workspaces/:wsId/announcements",
  requireAuth,
  requireMember,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { title, bodyHtml, pinned } = req.body || {};
      const cleanTitle = typeof title === "string" ? title.trim() : "";
      if (!cleanTitle) return res.status(400).json({ error: "Title is required" });
      if (cleanTitle.length > 200)
        return res.status(400).json({ error: "Title is too long (max 200)" });

      const cleaned = cleanHtml(bodyHtml);
      if (!hasContent(cleaned))
        return res.status(400).json({ error: "Body can't be empty" });

      const announcement = await prisma.announcement.create({
        data: {
          workspaceId: req.params.wsId,
          authorId: req.userId,
          title: cleanTitle,
          bodyHtml: cleaned,
          pinned: pinned === true,
        },
      });
      const hydrated = await attachAuthor(announcement);

      await logAudit({
        workspaceId: req.params.wsId,
        actorId: req.userId,
        action: "announcement.create",
        entity: { type: "Announcement", id: announcement.id },
        after: { title: announcement.title, pinned: announcement.pinned },
      });

      const io = req.app.get("io");
      io.to(`ws:${req.params.wsId}`).emit("announcement:created", hydrated);

      res.status(201).json(hydrated);
    } catch (e) {
      next(e);
    }
  }
);

/* ─────────────────────────────────────────────
   LIST — any workspace member
   ───────────────────────────────────────────── */

r.get(
  "/workspaces/:wsId/announcements",
  requireAuth,
  requireMember,
  async (req, res, next) => {
    try {
      // Cap page size so a workspace with thousands of announcements
      // can't blow up memory in a single request. Existing clients that
      // don't pass a page get the most recent page only.
      const safeTake = Math.min(Math.max(Number(req.query.take) || 50, 1), 100);
      const safePage = Math.max(Number(req.query.page) || 1, 1);
      const announcements = await prisma.announcement.findMany({
        where: { workspaceId: req.params.wsId },
        include: {
          comments: {
            include: {
              author: { select: AUTHOR_FIELDS },
            },
            orderBy: { createdAt: "asc" },
          },
          reactions: true,
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip: (safePage - 1) * safeTake,
        take: safeTake,
      });
      const hydrated = await attachAuthors(announcements);
      res.json(hydrated);
    } catch (e) {
      next(e);
    }
  }
);

/* ─────────────────────────────────────────────
   UPDATE / DELETE / PIN — admin only
   ───────────────────────────────────────────── */

r.patch("/announcements/:id", requireAuth, async (req, res, next) => {
  try {
    const before = await loadForAdmin(req, res);
    if (!before) return;

    const data = {};
    if (typeof req.body?.title === "string") {
      const t = req.body.title.trim();
      if (!t) return res.status(400).json({ error: "Title can't be empty" });
      if (t.length > 200)
        return res.status(400).json({ error: "Title is too long (max 200)" });
      data.title = t;
    }
    if (typeof req.body?.bodyHtml === "string") {
      const cleaned = cleanHtml(req.body.bodyHtml);
      if (!hasContent(cleaned))
        return res.status(400).json({ error: "Body can't be empty" });
      data.bodyHtml = cleaned;
    }
    if (typeof req.body?.pinned === "boolean") {
      data.pinned = req.body.pinned;
    }

    const announcement = await prisma.announcement.update({
      where: { id: before.id },
      data,
    });
    const hydrated = await attachAuthor(announcement);

    await logAudit({
      workspaceId: before.workspaceId,
      actorId: req.userId,
      action: "announcement.update",
      entity: { type: "Announcement", id: announcement.id },
      before: { title: before.title, pinned: before.pinned },
      after: { title: announcement.title, pinned: announcement.pinned },
    });

    const io = req.app.get("io");
    io.to(`ws:${before.workspaceId}`).emit("announcement:updated", hydrated);

    res.json(hydrated);
  } catch (e) {
    next(e);
  }
});

r.patch("/announcements/:id/pin", requireAuth, async (req, res, next) => {
  try {
    const before = await loadForAdmin(req, res);
    if (!before) return;

    const pinned = req.body?.pinned === true;
    const announcement = await prisma.announcement.update({
      where: { id: before.id },
      data: { pinned },
    });
    const hydrated = await attachAuthor(announcement);

    await logAudit({
      workspaceId: before.workspaceId,
      actorId: req.userId,
      action: pinned ? "announcement.pin" : "announcement.unpin",
      entity: { type: "Announcement", id: announcement.id },
      before: { pinned: before.pinned },
      after: { pinned: announcement.pinned },
    });

    const io = req.app.get("io");
    io.to(`ws:${before.workspaceId}`).emit("announcement:updated", hydrated);

    res.json(hydrated);
  } catch (e) {
    next(e);
  }
});

r.delete("/announcements/:id", requireAuth, async (req, res, next) => {
  try {
    const before = await loadForAdmin(req, res);
    if (!before) return;

    await prisma.announcement.delete({ where: { id: before.id } });

    await logAudit({
      workspaceId: before.workspaceId,
      actorId: req.userId,
      action: "announcement.delete",
      entity: { type: "Announcement", id: before.id },
      before: { title: before.title, pinned: before.pinned },
    });

    const io = req.app.get("io");
    io.to(`ws:${before.workspaceId}`).emit("announcement:deleted", {
      id: before.id,
      workspaceId: before.workspaceId,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   REACTIONS — any member
   ───────────────────────────────────────────── */

r.post("/announcements/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const announcement = await loadForMember(req, res);
    if (!announcement) return;

    const emoji = String(req.body?.emoji || "").trim();
    if (!emoji) return res.status(400).json({ error: "Emoji is required" });

    const existing = await prisma.reaction.findUnique({
      where: {
        announcementId_userId_emoji: {
          announcementId: req.params.id,
          userId: req.userId,
          emoji,
        },
      },
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      const updated = await loadAnnouncementForFeed(req.params.id);
      const io = req.app.get("io");
      io.to(`ws:${announcement.workspaceId}`).emit("announcement:updated", updated);
      return res.json(updated);
    }
    await prisma.reaction.create({
      data: { announcementId: req.params.id, userId: req.userId, emoji },
    });
    const updated = await loadAnnouncementForFeed(req.params.id);
    const io = req.app.get("io");
    io.to(`ws:${announcement.workspaceId}`).emit("announcement:updated", updated);
    res.status(201).json(updated);
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   COMMENTS — any member
   ───────────────────────────────────────────── */

r.post("/announcements/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const announcement = await loadForMember(req, res);
    if (!announcement) return;

    const { body, mentions = [] } = req.body || {};
    const trimmed = typeof body === "string" ? body.trim() : "";
    if (!trimmed) return res.status(400).json({ error: "Comment can't be empty" });

    const comment = await prisma.comment.create({
      data: {
        announcementId: req.params.id,
        authorId: req.userId,
        body: trimmed,
        mentions: Array.isArray(mentions) ? mentions : [],
      },
      include: { author: { select: AUTHOR_FIELDS } },
    });

    const io = req.app.get("io");
    // De-dupe mentions and never notify the author about their own comment.
    const requested = [...new Set(comment.mentions || [])].filter(
      (id) => id && id !== req.userId
    );

    // Restrict mention recipients to actual members of this workspace —
    // otherwise an attacker could push notifications to arbitrary users.
    let targets = [];
    let workspace = null;
    let recipientsById = new Map();
    if (requested.length) {
      const [members, ws] = await Promise.all([
        prisma.membership.findMany({
          where: { workspaceId: announcement.workspaceId, userId: { in: requested } },
          include: { user: { select: { id: true, email: true, name: true } } },
        }),
        prisma.workspace.findUnique({
          where: { id: announcement.workspaceId },
          select: { id: true, name: true, accentColor: true },
        }),
      ]);
      workspace = ws;
      recipientsById = new Map(members.map((m) => [m.userId, m.user]));
      targets = members.map((m) => m.userId);
    }
    const preview = trimmed.length > 140 ? trimmed.slice(0, 137) + "…" : trimmed;
    const emailPreview = trimmed.length > 140 ? trimmed.slice(0, 137) + "..." : trimmed;
    const announcementUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/w/${
      announcement.workspaceId
    }/announcements#a-${announcement.id}`;

    if (targets.length) {
      const payloadBase = {
        commentId: comment.id,
        announcementId: req.params.id,
        workspaceId: announcement.workspaceId,
        actorId: req.userId,
        actorName: comment.author?.name || null,
        announcementTitle: announcement.title,
        preview,
      };
      await prisma.notification.createMany({
        data: targets.map((userId) => ({
          userId,
          type: "mention",
          payload: payloadBase,
        })),
      });
      // Re-fetch the freshly-created rows so we can emit them with stable ids.
      const fresh = await prisma.notification.findMany({
        where: {
          userId: { in: targets },
          type: "mention",
          createdAt: { gte: new Date(Date.now() - 60_000) },
          // payload->>'commentId' filtering isn't portable across Prisma versions;
          // narrow by commentId in JS instead.
        },
        orderBy: { createdAt: "desc" },
        take: targets.length * 2,
      });
      const byUser = new Map();
      for (const n of fresh) {
        if (n.payload?.commentId === comment.id && !byUser.has(n.userId)) {
          byUser.set(n.userId, n);
        }
      }
      for (const userId of targets) {
        const note = byUser.get(userId);
        if (note) io.to(`user:${userId}`).emit("notification:new", note);

        const recipient = recipientsById.get(userId);
        if (recipient?.email) {
          await sendMentionEmail({
            to: recipient.email,
            recipientName: recipient.name,
            actorName: comment.author?.name || "Someone",
            workspaceName: workspace?.name || "your workspace",
            workspaceAccent: workspace?.accentColor || "#2563EB",
            announcementTitle: announcement.title,
            commentPreview: emailPreview,
            announcementUrl,
          });
        }
      }
    }

    const updated = await loadAnnouncementForFeed(req.params.id);
    io.to(`ws:${announcement.workspaceId}`).emit("announcement:updated", updated);
    res.status(201).json(updated);
  } catch (e) {
    next(e);
  }
});

export default r;
