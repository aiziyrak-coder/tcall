/** Brauzer audio kontekstini user gesture ichida ochish (iOS/Safari autoplay) */
export async function unlockBrowserAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;

    const ctx = new Ctx();
    if (ctx.state === "suspended") await ctx.resume();

    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);

    await ctx.close();
    return true;
  } catch {
    return false;
  }
}

export function configureRemoteAudioElement(el: HTMLAudioElement) {
  el.autoplay = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.volume = 1;
  el.muted = false;
}

export async function playMediaStreamOnElement(
  el: HTMLAudioElement,
  stream: MediaStream
): Promise<boolean> {
  configureRemoteAudioElement(el);
  el.srcObject = stream;
  try {
    await el.play();
    return true;
  } catch {
    return false;
  }
}
