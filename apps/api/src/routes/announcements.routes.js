import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

r.post("/workspaces/:wsId/announcements", requireAuth, async (req, res, next) => {
  try {
    const { title, bodyHtml } = req.body;
    const announcement = await prisma.announcement.create({
      data: { workspaceId: req.params.wsId, authorId: req.userId, title, bodyHtml: sanitizeHtml(bodyHtml) },
    });
    await logAudit({ workspaceId: req.params.wsId, actorId: req.userId, action: "announcement.create", entity: { type: "Announcement", id: announcement.id }, after: announcement });
    const io = req.app.get("io");
    io.to(`ws:${req.params.wsId}`).emit("announcement:created", announcement);
    res.status(201).json(announcement);
  } catch (e) { next(e); }
});

r.get("/workspaces/:wsId/announcements", requireAuth, async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { workspaceId: req.params.wsId },
      include: { comments: { include: { author: { select: { id: true, name: true, avatarUrl: true } } } }, reactions: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    res.json(announcements);
  } catch (e) { next(e); }
});

r.patch("/announcements/:id/pin", requireAuth, async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { pinned: req.body.pinned },
    });
    res.json(announcement);
  } catch (e) { next(e); }
});

r.post("/announcements/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const existing = await prisma.reaction.findUnique({
      where: { announcementId_userId_emoji: { announcementId: req.params.id, userId: req.userId, emoji } },
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ toggled: false });
    }
    const reaction = await prisma.reaction.create({
      data: { announcementId: req.params.id, userId: req.userId, emoji },
    });
    res.status(201).json({ toggled: true, reaction });
  } catch (e) { next(e); }
});

r.post("/announcements/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const { body, mentions = [] } = req.body;
    const comment = await prisma.comment.create({
      data: { announcementId: req.params.id, authorId: req.userId, body, mentions },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const io = req.app.get("io");
    for (const userId of mentions) {
      await prisma.notification.create({
        data: { userId, type: "mention", payload: { commentId: comment.id, announcementId: req.params.id } },
      });
      io.to(`user:${userId}`).emit("notification:new", { type: "mention" });
    }
    res.status(201).json(comment);
  } catch (e) { next(e); }
});

export default r;
