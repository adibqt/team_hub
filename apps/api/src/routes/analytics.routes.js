import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireMember } from "../middleware/auth.js";
import { listResponse } from "../utils/http.js";

const r = Router();

r.get("/:id/analytics/summary", requireAuth, requireMember, async (req, res, next) => {
  try {
    const wsId = req.params.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const [totalGoals, itemsCompletedThisWeek, overdueGoals, overdueItems] = await Promise.all([
      prisma.goal.count({ where: { workspaceId: wsId } }),
      prisma.actionItem.count({ where: { workspaceId: wsId, status: "DONE", createdAt: { gte: weekAgo } } }),
      prisma.goal.count({ where: { workspaceId: wsId, dueDate: { lt: now }, status: { not: "COMPLETED" } } }),
      prisma.actionItem.count({ where: { workspaceId: wsId, dueDate: { lt: now }, status: { not: "DONE" } } }),
    ]);

    res.json({
      totalGoals,
      itemsCompletedThisWeek,
      overdueCount: overdueGoals + overdueItems,
    });
  } catch (e) { next(e); }
});

r.get("/:id/analytics/completion", requireAuth, requireMember, async (req, res, next) => {
  try {
    const wsId = req.params.id;
    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const now = new Date();
    const earliest = new Date(now.getTime() - 7 * WEEK_MS);

    // Pull just completedAt for the window in a single query, then bucket
    // in JS — avoids 8 sequential DB round-trips.
    const completed = await prisma.goal.findMany({
      where: {
        workspaceId: wsId,
        status: "COMPLETED",
        completedAt: { gte: earliest },
      },
      select: { completedAt: true },
    });

    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now.getTime() - i * WEEK_MS);
      const end = new Date(start.getTime() + WEEK_MS);
      const year = start.getFullYear();
      const week = Math.ceil(((start - new Date(year, 0, 1)) / 86400000 + 1) / 7);
      const count = completed.filter(
        (g) => g.completedAt && g.completedAt >= start && g.completedAt < end
      ).length;
      weeks.push({
        week: `${year}-W${String(week).padStart(2, "0")}`,
        weekStart: start.toISOString(),
        completed: count,
      });
    }
    res.json(listResponse(weeks, { total: weeks.length }));
  } catch (e) { next(e); }
});

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

r.get("/:id/export.csv", requireAuth, requireMember, async (req, res, next) => {
  try {
    const [goals, items] = await Promise.all([
      prisma.goal.findMany({ where: { workspaceId: req.params.id } }),
      prisma.actionItem.findMany({ where: { workspaceId: req.params.id } }),
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=workspace-${req.params.id}.csv`);
    res.write("type,id,title,status,dueDate,createdAt\n");
    goals.forEach((g) =>
      res.write(
        [
          "goal",
          csvEscape(g.id),
          csvEscape(g.title),
          csvEscape(g.status),
          csvEscape(g.dueDate ? g.dueDate.toISOString() : ""),
          csvEscape(g.createdAt.toISOString()),
        ].join(",") + "\n"
      )
    );
    items.forEach((i) =>
      res.write(
        [
          "item",
          csvEscape(i.id),
          csvEscape(i.title),
          csvEscape(i.status),
          csvEscape(i.dueDate ? i.dueDate.toISOString() : ""),
          csvEscape(i.createdAt.toISOString()),
        ].join(",") + "\n"
      )
    );
    res.end();
  } catch (e) { next(e); }
});

export default r;
