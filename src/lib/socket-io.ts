import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

const userSockets = new Map<string, string>();

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

export function registerUserSocket(userId: string, socketId: string) {
  userSockets.set(userId, socketId);
}

export function unregisterUserSocket(userId: string, socketId: string) {
  if (userSockets.get(userId) === socketId) {
    userSockets.delete(userId);
  }
}

export function getUserSocketId(userId: string): string | undefined {
  return userSockets.get(userId);
}

export function isUserOnline(userId: string): boolean {
  if (!io) return userSockets.has(userId);
  const room = io.sockets.adapter.rooms.get(userRoom(userId));
  return (room?.size ?? 0) > 0;
}

/** user:${userId} xonasiga yuboradi — multi-tab va reconnect uchun ishonchli */
export function emitToUser(userId: string, event: string, data: unknown): boolean {
  if (!io) return false;
  const room = userRoom(userId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (!sockets || sockets.size === 0) {
    const fallback = userSockets.get(userId);
    if (fallback) {
      io.to(fallback).emit(event, data);
      return true;
    }
    return false;
  }
  io.to(room).emit(event, data);
  return true;
}
