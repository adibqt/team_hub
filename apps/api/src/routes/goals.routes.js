import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

r.post("/workspaces/:wsId/goals", requireAuth, async (req, res, next) => {
  try {
    const { title, description, ownerId, dueDate, status } = req.body;
    const goal = await prisma.goal.create({
      data: { workspaceId: req.params.wsId, title, description, ownerId: ownerId || req.userId, dueDate, status },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } }, milestones: true },
    });
    await logAudit({ workspaceId: req.params.wsId, actorId: req.userId, action: "goal.create", entity: { type: "Goal", id: goal.id }, after: goal });
    const io = req.app.get("io");
    io.to(`ws:${req.params.wsId}`).emit("goal:created", goal);
    res.status(201).json(goal);
  } catch (e) { next(e); }
});

r.get("/workspaces/:wsId/goals", requireAuth, async (req, res, next) => {
  try {
    const { page = 1, take = 20 } = req.query;
    const goals = await prisma.goal.findMany({
      where: { workspaceId: req.params.wsId },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } }, milestones: true },
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
