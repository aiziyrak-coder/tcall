/** Telefon jiringlash ovozi — Web Audio API (faqat user gesture dan keyin) */
let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrateInterval: ReturnType<typeof setInterval> | null = null;
let ringbackInterval: ReturnType<typeof setInterval> | null = null;
let pendingRingtone = false;
let pendingRingback = false;
let gestureListenerAttached = false;

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

export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const C =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return false;
    if (!audioCtx) audioCtx = new C();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    audioUnlocked = true;
    flushPending();
    return true;
  } catch {
    return false;
  }
}

/** Birinchi bosish/tugma bilan audio ruxsatini ochish */
export function setupAudioUnlockOnGesture() {
  if (typeof window === "undefined" || gestureListenerAttached) return;
  gestureListenerAttached = true;

  const unlock = () => {
    void unlockAudio();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

function getCtx(): AudioContext | null {
  if (!audioUnlocked || !audioCtx) return null;
  return audioCtx;
}

function safeVibrate(pattern: number | number[]) {
  if (!audioUnlocked) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

function playTone(freq: number, duration: number, ctx: AudioContext, startTime: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.25, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playRingCycle() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    playTone(440, 0.4, ctx, now);
    playTone(480, 0.4, ctx, now + 0.5);
    playTone(440, 0.4, ctx, now + 1.0);
    playTone(480, 0.4, ctx, now + 1.5);
  } catch {
    /* ignore */
  }
}

function playRingbackCycle() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    playTone(425, 0.15, ctx, now);
    playTone(425, 0.15, ctx, now + 0.2);
  } catch {
    /* ignore */
  }
}

function startRingbackInternal() {
  stopRingback();
  playRingbackCycle();
  ringbackInterval = setInterval(playRingbackCycle, 2000);
}

export function startRingback() {
  if (!audioUnlocked) {
    pendingRingback = true;
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
  playRingCycle();
  ringInterval = setInterval(playRingCycle, 3000);

  safeVibrate([400, 200, 400, 200, 400, 1000]);
  vibrateInterval = setInterval(() => {
    safeVibrate([400, 200, 400, 200, 400, 1000]);
  }, 3000);
}

export function startRingtone() {
  if (!audioUnlocked) {
    pendingRingtone = true;
    return;
  }
  startRingtoneInternal();
}

export function stopRingtone() {
  pendingRingtone = false;
  stopRingback();
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
    const now = ctx.currentTime;
    playTone(350 + Math.random() * 50, 0.08, ctx, now);
  } catch {
    /* ignore */
  }
}

export function playCallEndTone() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(400, 0.15, ctx, now);
    playTone(300, 0.25, ctx, now + 0.15);
  } catch {
    /* ignore */
  }
}
