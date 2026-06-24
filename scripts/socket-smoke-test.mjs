/**
 * Socket + dial delivery smoke test
 * Usage: node scripts/socket-smoke-test.mjs [baseUrl]
 */
import { io } from "socket.io-client";

const BASE = process.argv[2] || "https://tcall.vizara.uz";

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const h of setCookieHeaders) {
    const part = h.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function registerUser(label) {
  const email = `socket_${label}_${Date.now()}@test.local`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "testpass123456", name: `Socket ${label}`, language: "uz" }),
  });
  const body = await res.json();
  const jar = parseCookies(res.headers.getSetCookie?.() || []);
  if (!res.ok) throw new Error(`Register ${label} failed: ${JSON.stringify(body)}`);
  return { jar, user: body.user };
}

function connectSocket(jar) {
  const cookie = cookieHeader(jar);
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true,
      extraHeaders: { Cookie: cookie },
      transportOptions: {
        polling: { extraHeaders: { Cookie: cookie } },
      },
      timeout: 15000,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket connect timeout"));
    }, 15000);
    socket.on("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on("connect_error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function main() {
  console.log(`\nSocket smoke test → ${BASE}\n`);

  const userA = await registerUser("A");
  console.log("✓ Registered A", userA.user.tcallId);

  const userB = await registerUser("B");
  console.log("✓ Registered B", userB.user.tcallId);

  const socketB = await connectSocket(userB.jar);
  console.log("✓ Socket B connected", socketB.id);

  const incomingPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("incoming-call timeout")), 10000);
    socketB.once("incoming-call", (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

  const dialRes = await fetch(`${BASE}/api/calls/dial`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader(userA.jar) },
    body: JSON.stringify({ tcallId: userB.user.tcallId }),
  });
  const dialBody = await dialRes.json();
  if (!dialRes.ok) throw new Error(`Dial failed: ${JSON.stringify(dialBody)}`);
  console.log(`✓ Dial API room=${dialBody.roomId} delivered=${dialBody.delivered}`);

  if (!dialBody.delivered) {
    socketB.disconnect();
    throw new Error("Dial delivered=false — socket signal not received");
  }

  const incoming = await incomingPromise;
  console.log("✓ incoming-call received", incoming.roomId);

  socketB.disconnect();

  await fetch(`${BASE}/api/calls/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader(userA.jar) },
    body: JSON.stringify({ roomId: dialBody.roomId }),
  });
  console.log("✓ Call ended\nAll socket tests passed\n");
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
