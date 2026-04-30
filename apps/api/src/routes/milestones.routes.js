import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.post("/goals/:goalId/milestones", requireAuth, async (req, res, next) => {
  try {
    const { title, progress } = req.body;
    const milestone = await prisma.milestone.create({
      data: { goalId: req.params.goalId, title, progress: progress ?? 0 },
    });
    res.status(201).json(milestone);
  } catch (e) { next(e); }
});

r.patch("/milestones/:id", requireAuth, async (req, res, next) => {
  try {
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: { progress: req.body.progress, title: req.body.title },
    });
    res.json(milestone);
  } catch (e) { next(e); }
});

export default r;
