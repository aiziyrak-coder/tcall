/** Socket.IO klient — past signal va uzun kechikishlar uchun */

export const SOCKET_CLIENT_OPTIONS = {
  path: "/socket.io",
  /** Polling birinchi — 2G/3G va zaif Wi‑Fi da barqarorroq */
  transports: ["polling", "websocket"] as ("polling" | "websocket")[],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 20000,
  randomizationFactor: 0.45,
  timeout: 60_000,
  withCredentials: true,
  autoConnect: true,
};

export const SOCKET_WAIT_MS = 45_000;
