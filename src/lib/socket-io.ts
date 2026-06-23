import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

const userSockets = new Map<string, string>();

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function registerUserSocket(userId: string, socketId: string) {
  userSockets.set(userId, socketId);
}

/** Faqat shu socket hali ro'yxatdan o'tgan bo'lsa o'chiradi (multi-tab race fix) */
export function unregisterUserSocket(userId: string, socketId: string) {
  if (userSockets.get(userId) === socketId) {
    userSockets.delete(userId);
  }
}

export function getUserSocketId(userId: string): string | undefined {
  return userSockets.get(userId);
}

export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId);
}

export function emitToUser(userId: string, event: string, data: unknown): boolean {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}
