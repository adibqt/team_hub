import { prisma } from "../config/prisma.js";

export async function logAudit({ workspaceId, workspaceName, actorId, action, entity, before, after }) {
  return prisma.auditLog.create({
    data: {
      workspaceId,
      workspaceName,
      actorId,
      action,
      entityType: entity.type,
      entityId: entity.id,
      diff: before || after ? { before, after } : null,
    },
  });
}
