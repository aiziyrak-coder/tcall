import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

/** userId -> socketId */
const userSockets = new Map<string, string>();

export function registerUserSocket(userId: string, socketId: string) {
  userSockets.set(userId, socketId);
}

export function unregisterUserSocket(userId: string) {
  userSockets.delete(userId);
}

export function getUserSocketId(userId: string): string | undefined {
  return userSockets.get(userId);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
}
