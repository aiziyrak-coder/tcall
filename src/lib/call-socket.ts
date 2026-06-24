import type { Socket } from "socket.io-client";

type ConnectListener = (connected: boolean) => void;

let socketInstance: Socket | null = null;
let connectListeners = new Set<ConnectListener>();

export function setSharedCallSocket(socket: Socket | null) {
  socketInstance = socket;
}

export function getSharedCallSocket(): Socket | null {
  return socketInstance;
}

export function subscribeSocketConnect(fn: ConnectListener) {
  connectListeners.add(fn);
  if (socketInstance) fn(socketInstance.connected);
  return () => connectListeners.delete(fn);
}

export function notifySocketConnect(connected: boolean) {
  connectListeners.forEach((fn) => fn(connected));
}

export function waitForSharedSocket(timeoutMs = 15000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socketInstance?.connected) {
      resolve(socketInstance);
      return;
    }

    const timer = setTimeout(() => {
      unsub();
      reject(new Error("Socket ulanmadi"));
    }, timeoutMs);

    const unsub = subscribeSocketConnect((connected) => {
      if (connected && socketInstance?.connected) {
        clearTimeout(timer);
        unsub();
        resolve(socketInstance);
      }
    });

    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }
  });
}
