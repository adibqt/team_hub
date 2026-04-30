import { verifyAccess } from "../utils/tokens.js";
import cookie from "cookie";
import { prisma } from "../config/prisma.js";

const presence = new Map(); // workspaceId -> Set<userId>

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    try {
      const { sub } = verifyAccess(cookies.access);
      socket.userId = sub;
      next();
    } catch { next(new Error("unauthenticated")); }
  });

  io.on("connection", (socket) => {
    socket.on("workspace:join", async (workspaceId) => {
      const member = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: socket.userId, workspaceId } },
      });
      if (!member) return;
      socket.join(`ws:${workspaceId}`);
      socket.join(`user:${socket.userId}`);
      if (!presence.has(workspaceId)) presence.set(workspaceId, new Set());
      presence.get(workspaceId).add(socket.userId);
      io.to(`ws:${workspaceId}`).emit("presence:update", [...presence.get(workspaceId)]);

      socket.on("disconnect", () => {
        presence.get(workspaceId)?.delete(socket.userId);
        io.to(`ws:${workspaceId}`).emit("presence:update", [...(presence.get(workspaceId) || [])]);
      });
    });
  });
}
