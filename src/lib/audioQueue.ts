/** Tarjima ovozini navbat bilan ijro etish (mobil autoplay muammosini yengish) */
export class TranslationAudioQueue {
  private queue: string[] = [];
  private playing = false;
  private enabled = true;
  private unlocked = false;
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setSpeakingCallback(cb: (speaking: boolean) => void) {
    this.onSpeakingChange = cb;
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
        this.gainNode = this.ctx.createGain();
        this.gainNode.connect(this.ctx.destination);
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
  }

  private async playBase64Mp3(base64: string): Promise<void> {
    if (!this.unlocked) await this.unlock();
    const ctx = this.ctx;
    const gain = this.gainNode;
    if (!ctx || !gain) {
      await this.playWithHtmlAudio(base64);
      return;
    }

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gain);
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

    const base64 = this.queue.shift()!;
    await this.playBase64Mp3(base64);

    this.playing = false;

    if (this.queue.length > 0) {
      void this.processQueue();
    } else {
      this.onSpeakingChange?.(false);
    }
  }
}
