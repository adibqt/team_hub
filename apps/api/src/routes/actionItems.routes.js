import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireMember } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const ITEM_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  goal: { select: { id: true, title: true, status: true } },
};

function parseDueDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Error("Invalid due date");
  return d;
}

async function requireItemMember(req, res, next) {
  try {
    const item = await prisma.actionItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: req.userId, workspaceId: item.workspaceId } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this workspace" });
    req.item = item;
    req.workspaceId = item.workspaceId;
    req.membership = membership;
    next();
  } catch (e) {
    next(e);
  }
}

/* ─────────────────────────────────────────────  CREATE  ───────────────────────────────────────────── */
r.post("/workspaces/:wsId/items", requireAuth, requireMember, async (req, res, next) => {
  try {
    const { title, description, assigneeId, priority, status, dueDate, goalId } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ error: "Title must be 200 characters or fewer" });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const due = parseDueDate(dueDate);
    if (due instanceof Error) return res.status(400).json({ error: due.message });

    if (assigneeId) {
      const m = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: assigneeId, workspaceId: req.params.wsId } },
      });
      if (!m) return res.status(400).json({ error: "Assignee must be a member of this workspace" });
    }

    if (goalId) {
      const g = await prisma.goal.findUnique({ where: { id: goalId } });
      if (!g || g.workspaceId !== req.params.wsId) {
        return res.status(400).json({ error: "Parent goal must belong to this workspace" });
      }
    }

    const item = await prisma.actionItem.create({
      data: {
        workspaceId: req.params.wsId,
        title: title.trim(),
        description: description?.trim() || null,
        assigneeId: assigneeId || null,
        priority: priority || "MEDIUM",
        status: status || "TODO",
        dueDate: due ?? null,
        goalId: goalId || null,
      },
      include: ITEM_INCLUDE,
    });

    await logAudit({
      workspaceId: req.params.wsId,
      actorId: req.userId,
      action: "item.create",
      entity: { type: "ActionItem", id: item.id },
      after: { title: item.title, status: item.status, priority: item.priority, assigneeId: item.assigneeId, goalId: item.goalId, dueDate: item.dueDate },
    });

    const io = req.app.get("io");
    io.to(`ws:${req.params.wsId}`).emit("item:created", item);
    res.status(201).json(item);
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────  LIST  ───────────────────────────────────────────── */
r.get("/workspaces/:wsId/items", requireAuth, requireMember, async (req, res, next) => {
  try {
    const items = await prisma.actionItem.findMany({
      where: { workspaceId: req.params.wsId },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────  UPDATE  ───────────────────────────────────────────── */
r.patch("/items/:id", requireAuth, requireItemMember, async (req, res, next) => {
  try {
    const { title, description, assigneeId, priority, status, dueDate, goalId } = req.body || {};
    const data = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description = typeof description === "string" && description.trim() ? description.trim() : null;
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}` });
      }
      data.priority = priority;
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
      }
      data.status = status;
    }
    if (dueDate !== undefined) {
      const due = parseDueDate(dueDate);
      if (due instanceof Error) return res.status(400).json({ error: due.message });
      data.dueDate = due;
    }
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === "") {
        data.assigneeId = null;
      } else {
        const m = await prisma.membership.findUnique({
          where: { userId_workspaceId: { userId: assigneeId, workspaceId: req.workspaceId } },
        });
        if (!m) return res.status(400).json({ error: "Assignee must be a member of this workspace" });
        data.assigneeId = assigneeId;
      }
    }
    if (goalId !== undefined) {
      if (goalId === null || goalId === "") {
        data.goalId = null;
      } else {
        const g = await prisma.goal.findUnique({ where: { id: goalId } });
        if (!g || g.workspaceId !== req.workspaceId) {
          return res.status(400).json({ error: "Parent goal must belong to this workspace" });
        }
        data.goalId = goalId;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const before = req.item;
    const item = await prisma.actionItem.update({
      where: { id: req.params.id },
      data,
      include: ITEM_INCLUDE,
    });

    await logAudit({
      workspaceId: item.workspaceId,
      actorId: req.userId,
      action: "item.update",
      entity: { type: "ActionItem", id: item.id },
      before: { title: before.title, status: before.status, priority: before.priority, assigneeId: before.assigneeId, goalId: before.goalId, dueDate: before.dueDate },
      after:  { title: item.title,   status: item.status,   priority: item.priority,   assigneeId: item.assigneeId,   goalId: item.goalId,   dueDate: item.dueDate },
    });

    const io = req.app.get("io");
    io.to(`ws:${item.workspaceId}`).emit("item:updated", item);
    res.json(item);
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────  DELETE  ───────────────────────────────────────────── */
r.delete("/items/:id", requireAuth, requireItemMember, async (req, res, next) => {
  try {
    const before = req.item;
    await prisma.actionItem.delete({ where: { id: req.params.id } });
    await logAudit({
      workspaceId: before.workspaceId,
      actorId: req.userId,
      action: "item.delete",
      entity: { type: "ActionItem", id: req.params.id },
      before: { title: before.title, status: before.status, priority: before.priority, assigneeId: before.assigneeId, goalId: before.goalId },
    });
    const io = req.app.get("io");
    io.to(`ws:${before.workspaceId}`).emit("item:deleted", { id: req.params.id, workspaceId: before.workspaceId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
