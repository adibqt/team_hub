import { verifyAccess } from "../utils/tokens.js";
import cookie from "cookie";
import { prisma } from "../config/prisma.js";

/**
 * Compute the set of distinct userIds currently in `ws:<id>`. We derive
 * presence from the room membership rather than a separate Map so that
 * stale entries can't accumulate when a socket disconnects without
 * cleanup (e.g. transport crash, browser crash).
 */
function onlineUserIds(io, workspaceId) {
  const room = io.sockets.adapter.rooms.get(`ws:${workspaceId}`);
  if (!room) return [];
  const ids = new Set();
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s?.userId) ids.add(s.userId);
  }
  return [...ids];
}

function broadcastPresence(io, workspaceId) {
  io.to(`ws:${workspaceId}`).emit("presence:update", {
    workspaceId,
    userIds: onlineUserIds(io, workspaceId),
  });
}

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
    // Personal room so user-targeted events (notifications) reach them
    // immediately on connect, even before they enter a workspace.
    socket.join(`user:${socket.userId}`);
    socket.joinedWorkspaces = new Set();

    socket.on("workspace:join", async (workspaceId) => {
      if (!workspaceId || socket.joinedWorkspaces.has(workspaceId)) return;
      const member = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: socket.userId, workspaceId } },
      });
      if (!member) return;
      socket.join(`ws:${workspaceId}`);
      socket.joinedWorkspaces.add(workspaceId);
      broadcastPresence(io, workspaceId);
    });

    socket.on("workspace:leave", (workspaceId) => {
      if (!workspaceId || !socket.joinedWorkspaces.has(workspaceId)) return;
      socket.leave(`ws:${workspaceId}`);
      socket.joinedWorkspaces.delete(workspaceId);
      broadcastPresence(io, workspaceId);
    });

    socket.on("disconnect", () => {
      // After Socket.IO removes the socket from its rooms, recompute
      // presence for every workspace this socket was in.
      const rooms = [...socket.joinedWorkspaces];
      setImmediate(() => {
        for (const wsId of rooms) broadcastPresence(io, wsId);
      });
    });
  });
}
