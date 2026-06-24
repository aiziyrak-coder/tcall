/**
 * Interpreter API smoke test
 * Usage: node scripts/interpreter-test.mjs [baseUrl]
 */
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
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(path, opts = {}, jar = {}) {
  const headers = { ...(opts.headers || {}) };
  if (Object.keys(jar).length) headers.Cookie = cookieHeader(jar);
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
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

/** Minimal valid WAV — silence (Whisper should return no_speech) */
function makeSilentWav(seconds = 1, sampleRate = 16000) {
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function main() {
  console.log(`\nInterpreter test → ${BASE}\n`);

  const ts = Date.now();
  const email = `interp_${ts}@test.local`;
  const pass = "testpass123456";

  const reg = await req("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass, name: "Interp Test", language: "uz" }),
  });

  if (!reg.res.ok) {
    console.error("Register failed:", reg.body);
    process.exit(1);
  }
  console.log("✓ Register OK");

  let jar = reg.jar;
  const wav = makeSilentWav(1);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "speech.wav");
  form.append("sourceLang", "uz");
  form.append("targetLang", "en");
  form.append("withSpeech", "true");

  const interp = await req("/api/interpreter/process", { method: "POST", body: form }, jar);
  jar = interp.jar;

  if (interp.res.status === 422 && interp.body?.error === "no_speech") {
    console.log("✓ Interpreter API reachable — silent audio correctly rejected");
  } else if (interp.res.ok) {
    console.log("✓ Interpreter API OK — got response", interp.body?.translated?.slice(0, 40));
  } else {
    console.error("✗ Interpreter API unexpected:", interp.res.status, interp.body);
    process.exit(1);
  }

  const unauth = await req("/api/interpreter/process", { method: "POST", body: form });
  if (unauth.res.status === 401) console.log("✓ Interpreter requires auth");
  else console.error("✗ Auth guard failed", unauth.res.status);

  const locale = await req("/api/ui/locale?lang=tr", {}, jar);
  if (locale.res.ok && locale.body?.ui?.interpreterTab) {
    console.log("✓ UI locale API OK (tr)");
  } else {
    console.error("✗ UI locale failed", locale.res.status, locale.body?.error);
  }

  console.log("\nDone\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
