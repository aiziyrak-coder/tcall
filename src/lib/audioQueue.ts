/** Tarjima ovozini navbat bilan ijro etish (mobil autoplay muammosini yengish) */
export class TranslationAudioQueue {
  private queue: string[] = [];
  private playing = false;
  private enabled = true;
  private unlocked = false;
  private ctx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setSpeakingCallback(cb: (speaking: boolean) => void) {
    this.onSpeakingChange = cb;
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked) return true;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
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
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.playing = false;
    this.onSpeakingChange?.(false);
  }

  private async processQueue() {
    if (this.playing || this.queue.length === 0) return;
    if (!this.unlocked) {
      await this.unlock();
    }

    this.playing = true;
    this.onSpeakingChange?.(true);

    const base64 = this.queue.shift()!;
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audio.volume = 1;
      this.currentAudio = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      /* ignore */
    }

    this.currentAudio = null;
    this.playing = false;

    if (this.queue.length > 0) {
      void this.processQueue();
    } else {
      this.onSpeakingChange?.(false);
    }
  }
}
