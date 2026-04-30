import { io } from "socket.io-client";

let socket;

export const getSocket = () =>
  socket ??= io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket"],
  });
