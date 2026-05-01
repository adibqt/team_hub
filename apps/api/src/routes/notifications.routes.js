import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

/**
 * Newest first, capped — the bell only ever shows recent items. Older
 * notifications stay queryable on demand but we don't paginate yet.
 */
r.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, readAt: null },
    });
    res.json({ items, unreadCount });
  } catch (e) { next(e); }
});

r.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!n || n.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    if (n.readAt) return res.json(n);
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { readAt: new Date() },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

r.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
