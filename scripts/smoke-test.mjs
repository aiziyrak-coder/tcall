/**
 * Tcall production smoke test — auth, calls, security guards
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://tcall.uz";
const API = BASE;

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

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
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(path, opts = {}, jar = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar && Object.keys(jar).length) headers.Cookie = cookieHeader(jar);
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const setCookies = res.headers.getSetCookie?.() || [];
  const newJar = { ...jar, ...parseCookies(setCookies) };
  let body = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }
  return { res, body, jar: newJar };
}

async function main() {
  console.log(`\nTcall smoke test → ${API}\n`);

  const { res: healthRes } = await req("/api/health");
  if (healthRes.ok) pass("Health check", String(healthRes.status));
  else fail("Health check", String(healthRes.status));

  const unauth = await req("/api/auth/session");
  if (unauth.res.ok && unauth.body?.user === null) pass("Unauthenticated session returns null user");
  else fail("Unauthenticated session returns null user", JSON.stringify(unauth.body));

  const ts = Date.now();
  const emailA = `smoke_a_${ts}@test.local`;
  const emailB = `smoke_b_${ts}@test.local`;
  const pass123 = "testpass123456";

  let jarA = {};
  let jarB = {};

  const regA = await req(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password: pass123, name: "Smoke A", language: "uz" }),
    },
    jarA
  );
  jarA = regA.jar;
  if (regA.res.ok && regA.body?.user?.tcallId) {
    pass("Register user A", regA.body.user.tcallId);
  } else {
    fail("Register user A", JSON.stringify(regA.body));
    process.exit(1);
  }

  const regB = await req(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password: pass123, name: "Smoke B", language: "uz" }),
    },
    jarB
  );
  jarB = regB.jar;
  if (regB.res.ok && regB.body?.user?.tcallId) {
    pass("Register user B", regB.body.user.tcallId);
  } else {
    fail("Register user B", JSON.stringify(regB.body));
    process.exit(1);
  }

  const tcallIdB = regB.body.user.tcallId;

  const loginA = await req(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password: pass123 }),
    },
    {}
  );
  if (loginA.res.ok && loginA.body?.user?.tcallId) pass("Login user A");
  else fail("Login user A", JSON.stringify(loginA.body));

  const sessA = await req("/api/auth/session", {}, jarA);
  jarA = sessA.jar;
  if (sessA.res.ok && sessA.body?.user?.userId) pass("Session user A");
  else fail("Session user A", JSON.stringify(sessA.body));

  const lookup = await req(`/api/users/lookup?tcallId=${tcallIdB}`, {}, jarA);
  jarA = lookup.jar;
  if (lookup.res.ok && lookup.body?.found) pass("Lookup user B", lookup.body.user.name);
  else fail("Lookup user B", JSON.stringify(lookup.body));

  const room = await req(
    "/api/calls",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    jarA
  );
  jarA = room.jar;
  if (room.res.ok && room.body?.roomId) {
    pass("Create room", room.body.roomId);
    const len = room.body.roomId.length;
    if (len >= 6 && len <= 8) pass("Room ID format", String(len));
    else fail("Room ID format", String(len));

    const endRoom = await req(
      "/api/calls/end",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.body.roomId }),
      },
      jarA
    );
    jarA = endRoom.jar;
    if (endRoom.res.ok) pass("End waiting room");
    else fail("End waiting room", JSON.stringify(endRoom.body));
  } else {
    fail("Create room", JSON.stringify(room.body));
  }

  const dial = await req(
    "/api/calls/dial",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tcallId: tcallIdB }),
    },
    jarA
  );
  jarA = dial.jar;
  if (dial.res.ok && dial.body?.roomId) {
    pass("Dial API", `room=${dial.body.roomId} delivered=${dial.body.delivered}`);
  } else {
    fail("Dial API", `${dial.res.status} ${JSON.stringify(dial.body)}`);
  }

  if (dial.body?.roomId) {
    const join = await req(
      "/api/calls/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: dial.body.roomId }),
      },
      jarB
    );
    jarB = join.jar;
    if (join.res.ok && join.body.status === "active") pass("Callee join", join.body.status);
    else fail("Callee join", JSON.stringify(join.body));

    const end = await req(
      "/api/calls/end",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: dial.body.roomId }),
      },
      jarA
    );
    if (end.res.ok) pass("End call");
    else fail("End call", JSON.stringify(end.body));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
