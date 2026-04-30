import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.get("/:id/analytics/summary", requireAuth, async (req, res, next) => {
  try {
    const wsId = req.params.id;
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);

    const [totalGoals, completedThisWeek, overdueCount] = await Promise.all([
      prisma.goal.count({ where: { workspaceId: wsId } }),
      prisma.goal.count({ where: { workspaceId: wsId, status: "COMPLETED", createdAt: { gte: weekAgo } } }),
      prisma.goal.count({ where: { workspaceId: wsId, dueDate: { lt: now }, status: { not: "COMPLETED" } } }),
    ]);

    res.json({ totalGoals, completedThisWeek, overdueCount });
  } catch (e) { next(e); }
});

r.get("/:id/analytics/completion", requireAuth, async (req, res, next) => {
  try {
    const wsId = req.params.id;
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const year = start.getFullYear();
      const week = Math.ceil(((start - new Date(year, 0, 1)) / 86400000 + 1) / 7);
      const count = await prisma.goal.count({
        where: { workspaceId: wsId, status: "COMPLETED", createdAt: { gte: start, lt: end } },
      });
      weeks.push({ week: `${year}-W${String(week).padStart(2, "0")}`, completed: count });
    }
    res.json(weeks);
  } catch (e) { next(e); }
});

r.get("/:id/export.csv", requireAuth, async (req, res, next) => {
  try {
    const [goals, items] = await Promise.all([
      prisma.goal.findMany({ where: { workspaceId: req.params.id } }),
      prisma.actionItem.findMany({ where: { workspaceId: req.params.id } }),
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=workspace-${req.params.id}.csv`);
    res.write("type,id,title,status,createdAt\n");
    goals.forEach((g) => res.write(`goal,${g.id},${g.title},${g.status},${g.createdAt.toISOString()}\n`));
    items.forEach((i) => res.write(`item,${i.id},${i.title},${i.status},${i.createdAt.toISOString()}\n`));
    res.end();
  } catch (e) { next(e); }
});

export default r;
