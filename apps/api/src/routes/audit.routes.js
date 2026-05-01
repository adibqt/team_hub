import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.get("/:id/audit", requireAuth, async (req, res, next) => {
  try {
    const { actorId, actor, action, from, to, page = 1, take = 50 } = req.query;
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
        skip: (Number(page) - 1) * Number(take), take: Number(take),
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ rows, total });
  } catch (e) { next(e); }
});

r.get("/:id/audit.csv", requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.auditLog.findMany({
      where: { workspaceId: req.params.id }, orderBy: { createdAt: "desc" },
      include: { actor: true },
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=audit-${req.params.id}.csv`);
    res.write("createdAt,actor,action,entityType,entityId\n");
    rows.forEach((row) =>
      res.write(`${row.createdAt.toISOString()},${row.actor.email},${row.action},${row.entityType},${row.entityId}\n`)
    );
    res.end();
  } catch (e) { next(e); }
});

export default r;
