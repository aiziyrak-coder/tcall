import type { Server as SocketIOServer } from "socket.io";

type SocketStore = {
  io: SocketIOServer | null;
  userSockets: Map<string, string>;
};

const globalStore = globalThis as typeof globalThis & { __tcallSocketStore?: SocketStore };

function store(): SocketStore {
  if (!globalStore.__tcallSocketStore) {
    globalStore.__tcallSocketStore = { io: null, userSockets: new Map() };
  }
  return globalStore.__tcallSocketStore;
}

export function setSocketIO(server: SocketIOServer) {
  store().io = server;
}

export function getSocketIO(): SocketIOServer | null {
  return store().io;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

export function registerUserSocket(userId: string, socketId: string) {
  store().userSockets.set(userId, socketId);
}

export function unregisterUserSocket(userId: string, socketId: string) {
  const map = store().userSockets;
  if (map.get(userId) === socketId) {
    map.delete(userId);
  }
}

export function getUserSocketId(userId: string): string | undefined {
  return store().userSockets.get(userId);
}

export function isUserOnline(userId: string): boolean {
  const io = store().io;
  if (!io) return store().userSockets.has(userId);
  const room = io.sockets.adapter.rooms.get(userRoom(userId));
  return (room?.size ?? 0) > 0;
}

/** user:${userId} xonasiga yuboradi — multi-tab va reconnect uchun ishonchli */
export function emitToUser(userId: string, event: string, data: unknown): boolean {
  const io = store().io;
  if (!io) return false;
  const room = userRoom(userId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (!sockets || sockets.size === 0) {
    const fallback = store().userSockets.get(userId);
    if (fallback) {
      io.to(fallback).emit(event, data);
      return true;
    }
    return false;
  }
  io.to(room).emit(event, data);
  return true;
}
