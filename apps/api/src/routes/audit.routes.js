import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireMember, requireAdmin } from "../middleware/auth.js";

const r = Router();

const MAX_TAKE = 200;

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

r.get("/:id/audit", requireAuth, requireMember, async (req, res, next) => {
  try {
    const { actorId, actor, action, from, to, page = 1, take = 50 } = req.query;
    const safeTake = Math.min(Math.max(Number(take) || 50, 1), MAX_TAKE);
    const safePage = Math.max(Number(page) || 1, 1);
    const where = {
      workspaceId: req.params.id,
      ...(actorId && { actorId }),
      ...(actor && {
        actor: {
          OR: [
            { name:  { contains: actor, mode: "insensitive" } },
            { email: { contains: actor, mode: "insensitive" } },
          ],
        },
      }),
      ...(action  && { action: { contains: action, mode: "insensitive" } }),
      ...(from || to ? { createdAt: { gte: from && new Date(from), lte: to && new Date(to) } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safeTake, take: safeTake,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ rows, total });
  } catch (e) { next(e); }
});

r.get("/:id/audit.csv", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=audit-${req.params.id}.csv`);
    res.write("createdAt,actor,action,entityType,entityId\n");

    // Stream in pages so very large audit histories don't load into memory at once.
    const PAGE = 500;
    let cursor;
    while (true) {
      const batch = await prisma.auditLog.findMany({
        where: { workspaceId: req.params.id },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { email: true } } },
        take: PAGE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (!batch.length) break;
      for (const row of batch) {
        res.write(
          [
            csvEscape(row.createdAt.toISOString()),
            csvEscape(row.actor?.email || ""),
            csvEscape(row.action),
            csvEscape(row.entityType),
            csvEscape(row.entityId),
          ].join(",") + "\n"
        );
      }
      if (batch.length < PAGE) break;
      cursor = batch[batch.length - 1].id;
    }
    res.end();
  } catch (e) { next(e); }
});

export default r;
