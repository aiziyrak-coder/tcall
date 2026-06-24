/**
 * Tcall brand qo'ng'iroq ovozlari — Web Audio API
 * "Tcall Connect" — o'ziga xos kiruvchi chaqiruv melodiyasi
 */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrateInterval: ReturnType<typeof setInterval> | null = null;
let ringbackInterval: ReturnType<typeof setInterval> | null = null;
let pendingRingtone = false;
let pendingRingback = false;
let gestureListenerAttached = false;
let masterGain: GainNode | null = null;
let userHasGestured = false;

export function markUserGesture() {
  userHasGestured = true;
}

/** Tcall Connect — kiruvchi qo'ng'iroq melodiyasi (E-dur, ~4.2s tsikl) */
const TCALL_RING_NOTES: { freq: number; at: number; dur: number; vol?: number }[] = [
  { freq: 659.25, at: 0.0, dur: 0.2 },   // E5
  { freq: 830.61, at: 0.24, dur: 0.2 },  // G#5
  { freq: 987.77, at: 0.48, dur: 0.24 }, // B5
  { freq: 1318.51, at: 0.76, dur: 0.52 }, // E6 — asosiy urg'u
  { freq: 987.77, at: 1.18, dur: 0.22, vol: 0.55 }, // B5 echo
  { freq: 880.0, at: 1.48, dur: 0.2 },   // A5
  { freq: 987.77, at: 1.74, dur: 0.2 },   // B5
  { freq: 1174.66, at: 2.0, dur: 0.38 },  // D6
  { freq: 987.77, at: 2.48, dur: 0.32 },  // B5 — tugash
  { freq: 1318.51, at: 2.92, dur: 0.28, vol: 0.7 }, // E6 ping
];

const RING_CYCLE_MS = 4200;

export function isAudioUnlocked() {
  return audioUnlocked;
}

function flushPending() {
  if (pendingRingtone) {
    pendingRingtone = false;
    startRingtoneInternal();
  }
  if (pendingRingback) {
    pendingRingback = false;
    startRingbackInternal();
  }
}

function ensureMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const C =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return false;
    if (!audioCtx) audioCtx = new C();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    ensureMasterGain(audioCtx);
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    audioUnlocked = true;
    markUserGesture();
    flushPending();
    return true;
  } catch {
    return false;
  }
}

export function setupAudioUnlockOnGesture() {
  if (typeof window === "undefined" || gestureListenerAttached) return;
  gestureListenerAttached = true;

  const unlock = () => {
    markUserGesture();
    void unlockAudio();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

function getCtx(): AudioContext | null {
  if (!audioUnlocked || !audioCtx) return null;
  return audioCtx;
}

function safeVibrate(pattern: number | number[]) {
  if (!userHasGestured) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** Boy, musiqiy ohang — triangle + harmonik + filter */
function playRichNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.32
) {
  const dest = ensureMasterGain(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(freq * 4, 8000), startTime);
  filter.Q.value = 0.7;
  filter.connect(dest);

  const env = ctx.createGain();
  env.connect(filter);
  env.gain.setValueAtTime(0.001, startTime);
  env.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
  env.gain.setValueAtTime(volume * 0.85, startTime + duration * 0.35);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = freq;
  osc1.connect(env);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.12;
  osc2.connect(harmGain);
  harmGain.connect(env);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
}

function playTone(freq: number, duration: number, ctx: AudioContext, startTime: number, vol = 0.22) {
  playRichNote(ctx, freq, startTime, duration, vol);
}

function playTcallRingCycle() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const note of TCALL_RING_NOTES) {
      playRichNote(ctx, note.freq, now + note.at, note.dur, note.vol ?? 0.32);
    }
  } catch {
    /* ignore */
  }
}

/** Chiquvchi qo'ng'iroq — tarmoq uslubidagi ringback (juft ohang) */
function playRingbackCycle() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const dest = ensureMasterGain(ctx);
    const dur = 1.05;

    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(dest);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
      gain.gain.setValueAtTime(0.12, now + dur - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
  } catch {
    /* ignore */
  }
}

function startRingbackInternal() {
  stopRingback();
  playRingbackCycle();
  ringbackInterval = setInterval(playRingbackCycle, 3200);
}

export function startRingback() {
  if (!audioUnlocked) {
    pendingRingback = true;
    void unlockAudio();
    return;
  }
  startRingbackInternal();
}

export function stopRingback() {
  pendingRingback = false;
  if (ringbackInterval) {
    clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
}

function startRingtoneInternal() {
  stopRingtone();
  playTcallRingCycle();
  ringInterval = setInterval(playTcallRingCycle, RING_CYCLE_MS);

  safeVibrate([300, 120, 300, 120, 500, 800]);
  vibrateInterval = setInterval(() => {
    safeVibrate([300, 120, 300, 120, 500, 800]);
  }, RING_CYCLE_MS);
}

export function startRingtone() {
  if (!audioUnlocked) {
    pendingRingtone = true;
    void unlockAudio().then((ok) => {
      if (ok && pendingRingtone) {
        pendingRingtone = false;
        startRingtoneInternal();
      }
    });
    return;
  }
  startRingtoneInternal();
}

export function stopRingtone() {
  pendingRingtone = false;
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (vibrateInterval) {
    clearInterval(vibrateInterval);
    vibrateInterval = null;
  }
  safeVibrate(0);
}

export function playDialTone() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    playRichNote(ctx, 520, ctx.currentTime, 0.06, 0.18);
  } catch {
    /* ignore */
  }
}

export function playCallEndTone() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    playRichNote(ctx, 523.25, now, 0.18, 0.28);       // C5
    playRichNote(ctx, 392.0, now + 0.16, 0.28, 0.24); // G4
    playRichNote(ctx, 261.63, now + 0.34, 0.35, 0.2); // C4
  } catch {
    /* ignore */
  }
}
