import { Router } from "express";
import { prisma } from "../config/prisma.js";
import {
  requireAuth,
  requireGoalMember,
  requireMilestoneMember,
} from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

const r = Router();

function clampProgress(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ─────────────────────────────────────────────
   CREATE milestone (nested under a goal)
   ───────────────────────────────────────────── */
r.post(
  "/goals/:goalId/milestones",
  requireAuth,
  requireGoalMember,
  async (req, res, next) => {
    try {
      const { title, progress } = req.body || {};

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Milestone title is required" });
      }
      if (title.trim().length > 200) {
        return res
          .status(400)
          .json({ error: "Title must be 200 characters or fewer" });
      }

      let p = 0;
      if (progress !== undefined && progress !== null && progress !== "") {
        const clamped = clampProgress(progress);
        if (clamped === null) {
          return res
            .status(400)
            .json({ error: "Progress must be a number between 0 and 100" });
        }
        p = clamped;
      }

      const milestone = await prisma.milestone.create({
        data: {
          goalId: req.params.goalId,
          title: title.trim(),
          progress: p,
        },
      });

      await logAudit({
        workspaceId: req.workspaceId,
        actorId: req.userId,
        action: "milestone.create",
        entity: { type: "Milestone", id: milestone.id },
        after: {
          goalId: milestone.goalId,
          title: milestone.title,
          progress: milestone.progress,
        },
      });

      const io = req.app.get("io");
      io.to(`ws:${req.workspaceId}`).emit("milestone:created", {
        ...milestone,
        workspaceId: req.workspaceId,
      });

      res.status(201).json(milestone);
    } catch (e) {
      next(e);
    }
  }
);

/* ─────────────────────────────────────────────
   UPDATE milestone — title and/or progress
   ───────────────────────────────────────────── */
r.patch(
  "/milestones/:id",
  requireAuth,
  requireMilestoneMember,
  async (req, res, next) => {
    try {
      const { title, progress } = req.body || {};
      const data = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          return res.status(400).json({ error: "Title cannot be empty" });
        }
        if (title.trim().length > 200) {
          return res
            .status(400)
            .json({ error: "Title must be 200 characters or fewer" });
        }
        data.title = title.trim();
      }

      if (progress !== undefined && progress !== null && progress !== "") {
        const clamped = clampProgress(progress);
        if (clamped === null) {
          return res
            .status(400)
            .json({ error: "Progress must be a number between 0 and 100" });
        }
        data.progress = clamped;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
      }

      const before = req.milestone;
      const milestone = await prisma.milestone.update({
        where: { id: req.params.id },
        data,
      });

      await logAudit({
        workspaceId: req.workspaceId,
        actorId: req.userId,
        action: "milestone.update",
        entity: { type: "Milestone", id: milestone.id },
        before: { title: before.title, progress: before.progress },
        after: { title: milestone.title, progress: milestone.progress },
      });

      const io = req.app.get("io");
      io.to(`ws:${req.workspaceId}`).emit("milestone:updated", {
        ...milestone,
        workspaceId: req.workspaceId,
      });

      res.json(milestone);
    } catch (e) {
      next(e);
    }
  }
);

/* ─────────────────────────────────────────────
   DELETE milestone
   ───────────────────────────────────────────── */
r.delete(
  "/milestones/:id",
  requireAuth,
  requireMilestoneMember,
  async (req, res, next) => {
    try {
      await prisma.milestone.delete({ where: { id: req.params.id } });

      await logAudit({
        workspaceId: req.workspaceId,
        actorId: req.userId,
        action: "milestone.delete",
        entity: { type: "Milestone", id: req.milestone.id },
        before: {
          title: req.milestone.title,
          progress: req.milestone.progress,
        },
      });

      const io = req.app.get("io");
      io.to(`ws:${req.workspaceId}`).emit("milestone:deleted", {
        id: req.milestone.id,
        goalId: req.milestone.goalId,
        workspaceId: req.workspaceId,
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default r;
