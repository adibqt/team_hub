import { io } from "socket.io-client";
import api from "./api";

let socket;
let refreshing = null;

export const getSocket = () => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    withCredentials: true,
    // Allow polling fallback so the client still works behind proxies
    // that strip the websocket upgrade.
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  // If the server rejects the handshake because the access cookie has
  // expired, hit /api/auth/refresh once and let socket.io reconnect with
  // the fresh cookie. Multiple sockets share a single in-flight refresh.
  socket.on("connect_error", async (err) => {
    const message = err?.message || "";
    if (!message.toLowerCase().includes("unauthenticated")) return;
    try {
      refreshing = refreshing || api.post("/api/auth/refresh");
      await refreshing;
    } catch {
      // refresh failed — let the HTTP layer redirect to /login on its
      // next request; we just stop trying to reconnect quietly.
      socket.disconnect();
      return;
    } finally {
      refreshing = null;
    }
    if (!socket.connected) socket.connect();
  });

  return socket;
};
