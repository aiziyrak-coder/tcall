/** Tarjima ovozini navbat bilan ijro etish (mobil autoplay + baland ovoz) */
const PLAYBACK_GAIN = 3.2;
const TARGET_PEAK = 0.92;

function normalizeAudioBuffer(ctx: AudioContext, buffer: AudioBuffer): AudioBuffer {
  const channels = buffer.numberOfChannels;
  let peak = 0;

  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }

  if (peak < 0.001) return buffer;

  const gain = TARGET_PEAK / peak;
  const out = ctx.createBuffer(channels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < channels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < src.length; i++) {
      dst[i] = src[i] * gain;
    }
  }
  return out;
}

export class TranslationAudioQueue {
  private queue: string[] = [];
  private static readonly MAX_QUEUE = 5;
  private playing = false;
  private enabled = true;
  private unlocked = false;
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;
  private duckRemote: ((duck: boolean) => void) | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setSpeakingCallback(cb: (speaking: boolean) => void) {
    this.onSpeakingChange = cb;
  }

  setRemoteDuckCallback(cb: (duck: boolean) => void) {
    this.duckRemote = cb;
  }

  isActive(): boolean {
    return this.playing || this.queue.length > 0;
  }

  private ensureGraph(ctx: AudioContext) {
    if (!this.gainNode || !this.compressor) {
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;

      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = PLAYBACK_GAIN;

      this.compressor.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);
    }
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked && this.ctx?.state === "running") return true;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new Ctx();
        this.ensureGraph(this.ctx);
      }
      if (this.ctx.state === "suspended") await this.ctx.resume();
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
      this.unlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  enqueue(base64: string) {
    if (!this.enabled || !base64) return;
    if (this.queue.length >= TranslationAudioQueue.MAX_QUEUE) {
      this.queue.shift();
    }
    this.queue.push(base64);
    void this.processQueue();
  }

  stop() {
    this.queue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        /* ignore */
      }
      this.currentSource = null;
    }
    this.playing = false;
    this.onSpeakingChange?.(false);
    this.duckRemote?.(false);
  }

  private async playBase64Mp3(base64: string): Promise<void> {
    if (!this.unlocked) await this.unlock();
    const ctx = this.ctx;
    const compressor = this.compressor;
    if (!ctx || !compressor) {
      await this.playWithHtmlAudio(base64);
      return;
    }

    this.ensureGraph(ctx);

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const normalized = normalizeAudioBuffer(ctx, decoded);
      const source = ctx.createBufferSource();
      source.buffer = normalized;
      source.connect(compressor);
      this.currentSource = source;

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    } catch {
      await this.playWithHtmlAudio(base64);
    } finally {
      this.currentSource = null;
    }
  }

  private async playWithHtmlAudio(base64: string): Promise<void> {
    try {
      if (!this.unlocked) await this.unlock();
      const ctx = this.ctx;
      if (ctx && this.compressor) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
        const normalized = normalizeAudioBuffer(ctx, decoded);
        const source = ctx.createBufferSource();
        source.buffer = normalized;
        source.connect(this.compressor);
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start(0);
        });
        return;
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audio.volume = 1;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      /* ignore */
    }
  }

  private async processQueue() {
    if (this.playing || this.queue.length === 0) return;
    if (!this.unlocked) {
      await this.unlock();
    }

    this.playing = true;
    this.onSpeakingChange?.(true);
    this.duckRemote?.(true);

    const base64 = this.queue.shift()!;
    await this.playBase64Mp3(base64);

    this.playing = false;

    if (this.queue.length > 0) {
      void this.processQueue();
    } else {
      this.onSpeakingChange?.(false);
      this.duckRemote?.(false);
    }
  }
}
