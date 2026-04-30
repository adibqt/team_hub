import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { env } from "./config/env.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CLIENT_URL, credentials: true },
});
app.set("io", io);
registerSocketHandlers(io);

server.listen(env.PORT, () => console.log(`API on :${env.PORT}`));
