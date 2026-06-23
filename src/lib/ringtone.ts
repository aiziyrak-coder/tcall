/** Telefon jiringlash ovozi — Web Audio API */
let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrateInterval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new C();
  }
  return audioCtx;
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
  try {
    const ctx = getCtx();
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

export function startRingtone() {
  stopRingtone();
  playRingCycle();
  ringInterval = setInterval(playRingCycle, 3000);

  if ("vibrate" in navigator) {
    navigator.vibrate([400, 200, 400, 200, 400, 1000]);
    vibrateInterval = setInterval(() => {
      navigator.vibrate([400, 200, 400, 200, 400, 1000]);
    }, 3000);
  }
}

export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (vibrateInterval) {
    clearInterval(vibrateInterval);
    vibrateInterval = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
}

export async function unlockAudio(): Promise<void> {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

export function playDialTone() {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    playTone(350 + Math.random() * 50, 0.08, ctx, now);
  } catch {
    /* ignore */
  }
}

export function playCallEndTone() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    playTone(400, 0.15, ctx, now);
    playTone(300, 0.25, ctx, now + 0.15);
  } catch {
    /* ignore */
  }
}
