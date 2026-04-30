import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

r.post("/workspaces/:wsId/items", requireAuth, async (req, res, next) => {
  try {
    const { title, description, assigneeId, priority, status, dueDate, goalId } = req.body;
    const item = await prisma.actionItem.create({
      data: { workspaceId: req.params.wsId, title, description, assigneeId, priority, status, dueDate, goalId },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await logAudit({ workspaceId: req.params.wsId, actorId: req.userId, action: "item.create", entity: { type: "ActionItem", id: item.id }, after: item });
    const io = req.app.get("io");
    io.to(`ws:${req.params.wsId}`).emit("item:created", item);
    res.status(201).json(item);
  } catch (e) { next(e); }
});

r.get("/workspaces/:wsId/items", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.actionItem.findMany({
      where: { workspaceId: req.params.wsId },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) { next(e); }
});

r.patch("/items/:id", requireAuth, async (req, res, next) => {
  try {
    const before = await prisma.actionItem.findUnique({ where: { id: req.params.id } });
    const item = await prisma.actionItem.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ workspaceId: item.workspaceId, actorId: req.userId, action: "item.update", entity: { type: "ActionItem", id: item.id }, before, after: item });
    const io = req.app.get("io");
    io.to(`ws:${item.workspaceId}`).emit("item:updated", item);
    res.json(item);
  } catch (e) { next(e); }
});

r.delete("/items/:id", requireAuth, async (req, res, next) => {
  try {
    const before = await prisma.actionItem.findUnique({ where: { id: req.params.id } });
    await prisma.actionItem.delete({ where: { id: req.params.id } });
    await logAudit({ workspaceId: before.workspaceId, actorId: req.userId, action: "item.delete", entity: { type: "ActionItem", id: req.params.id }, before });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
