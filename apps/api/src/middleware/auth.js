import { verifyAccess } from "../utils/tokens.js";
import { prisma } from "../config/prisma.js";

export function requireAuth(req, res, next) {
  try {
    const { sub } = verifyAccess(req.cookies.access);
    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
}

/**
 * Resolves the current user's membership for the workspace identified by
 * `:id`, `:wsId`, or `req.body.workspaceId`. Stashes it on req.membership so
 * downstream handlers and `requireAdmin` can reuse it.
 */
export async function requireMember(req, res, next) {
  try {
    const workspaceId =
      req.params.id || req.params.wsId || req.body?.workspaceId;
    if (!workspaceId)
      return res.status(400).json({ error: "workspaceId required" });

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: req.userId, workspaceId } },
    });
    if (!membership)
      return res.status(403).json({ error: "Not a member of this workspace" });

    req.membership = membership;
    req.workspaceId = workspaceId;
    next();
  } catch (e) {
    next(e);
  }
}

/** Must run AFTER requireMember. Restricts to ADMIN role. */
export function requireAdmin(req, res, next) {
  if (req.membership?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}

/**
 * Resolves a Goal by `req.params.goalId` (or `req.params.id` for routes mounted
 * directly under /goals/:id) and verifies the caller is a member of that goal's
 * workspace. Stashes the goal + membership on req for downstream handlers.
 */
export async function requireGoalMember(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id;
    if (!goalId) return res.status(400).json({ error: "goalId required" });

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: req.userId, workspaceId: goal.workspaceId },
      },
    });
    if (!membership)
      return res.status(403).json({ error: "Not a member of this workspace" });

    req.goal = goal;
    req.workspaceId = goal.workspaceId;
    req.membership = membership;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Resolves a Milestone by `req.params.id` and verifies the caller is a member
 * of the parent goal's workspace.
 */
export async function requireMilestoneMember(req, res, next) {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      include: { goal: true },
    });
    if (!milestone || !milestone.goal)
      return res.status(404).json({ error: "Milestone not found" });

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId,
          workspaceId: milestone.goal.workspaceId,
        },
      },
    });
    if (!membership)
      return res.status(403).json({ error: "Not a member of this workspace" });

    req.milestone = milestone;
    req.goal = milestone.goal;
    req.workspaceId = milestone.goal.workspaceId;
    req.membership = membership;
    next();
  } catch (e) {
    next(e);
  }
}
