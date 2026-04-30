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
