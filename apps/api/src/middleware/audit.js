import { logAudit } from "../services/audit.js";

export function auditMiddleware(action, entityType, getEntityId) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400 && req.workspaceId) {
        await logAudit({
          workspaceId: req.workspaceId,
          actorId: req.userId,
          action,
          entity: { type: entityType, id: getEntityId(data, req) },
          after: data,
        }).catch(console.error);
      }
      return originalJson(data);
    };
    next();
  };
}
