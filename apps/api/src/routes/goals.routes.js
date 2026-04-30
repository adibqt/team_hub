import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireMember } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

const VALID_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"];

r.post("/workspaces/:wsId/goals", requireAuth, requireMember, async (req, res, next) => {
  try {
    const { title, description, ownerId, dueDate, status } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ error: "Title must be 200 characters or fewer" });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    let parsedDueDate = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid due date" });
      }
      parsedDueDate = d;
    }

    // Owner must be a member of this workspace. Defaults to the creator.
    const resolvedOwnerId = ownerId || req.userId;
    const ownerMembership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: resolvedOwnerId, workspaceId: req.params.wsId } },
    });
    if (!ownerMembership) {
      return res.status(400).json({ error: "Owner must be a member of this workspace" });
    }

    const goal = await prisma.goal.create({
      data: {
        workspaceId: req.params.wsId,
        title: title.trim(),
        description: description?.trim() || null,
        ownerId: resolvedOwnerId,
        dueDate: parsedDueDate,
        status: status || "NOT_STARTED",
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        milestones: true,
      },
    });
    await logAudit({
      workspaceId: req.params.wsId,
      actorId: req.userId,
      action: "goal.create",
      entity: { type: "Goal", id: goal.id },
      after: { title: goal.title, ownerId: goal.ownerId, status: goal.status, dueDate: goal.dueDate },
    });
    const io = req.app.get("io");
    io.to(`ws:${req.params.wsId}`).emit("goal:created", goal);
    res.status(201).json(goal);
  } catch (e) { next(e); }
});

r.get("/workspaces/:wsId/goals", requireAuth, requireMember, async (req, res, next) => {
  try {
    const { page = 1, take = 20 } = req.query;
    const goals = await prisma.goal.findMany({
      where: { workspaceId: req.params.wsId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        milestones: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * Number(take),
      take: Number(take),
    });
    res.json(goals);
  } catch (e) { next(e); }
});

r.patch("/goals/:id", requireAuth, async (req, res, next) => {
  try {
    const before = await prisma.goal.findUnique({ where: { id: req.params.id } });
    const goal = await prisma.goal.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ workspaceId: goal.workspaceId, actorId: req.userId, action: "goal.update", entity: { type: "Goal", id: goal.id }, before, after: goal });
    const io = req.app.get("io");
    io.to(`ws:${goal.workspaceId}`).emit("goal:updated", goal);
    res.json(goal);
  } catch (e) { next(e); }
});

r.post("/goals/:id/updates", requireAuth, async (req, res, next) => {
  try {
    const update = await prisma.goalUpdate.create({
      data: { goalId: req.params.id, authorId: req.userId, body: req.body.body },
    });
    res.status(201).json(update);
  } catch (e) { next(e); }
});

r.get("/goals/:id/updates", requireAuth, async (req, res, next) => {
  try {
    const updates = await prisma.goalUpdate.findMany({
      where: { goalId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(updates);
  } catch (e) { next(e); }
});

export default r;
