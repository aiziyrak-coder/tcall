import { getPreferredAudioMimeType, isIOS } from "@/lib/mobile";

export const MIN_UTTERANCE_MS = 1600;
export const MIN_BLOB_BYTES = 1800;
const MAX_UTTERANCE_MS = 12_000;
const SILENCE_MS = 900;
const VAD_INTERVAL_MS = 120;
const SPEECH_RMS = 0.014;
const SPEECH_HITS = 2;

export type UtteranceHandler = (blob: Blob, durationMs: number) => void;

/** Qo'ng'iroqda nutq bo'laklarini ajratish — avto (VAD) va PTT */
export class CallUtteranceRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private vadTimer: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = "audio/webm";
  private utteranceStart = 0;
  private speechHits = 0;
  private silenceSince = 0;
  private capturing = false;
  private captureMode: "auto" | "ptt" | null = null;
  private autoEnabled = false;
  private pttActive = false;
  private iosMaxTimer: ReturnType<typeof setTimeout> | null = null;

  onUtterance: UtteranceHandler | null = null;
  onPttUtterance: UtteranceHandler | null = null;
  onPttTooShort: (() => void) | null = null;
  onRecorderError: (() => void) | null = null;
  onListeningChange: ((listening: boolean) => void) | null = null;

  attach(stream: MediaStream) {
    this.stream = stream;
    this.setupAnalyser(stream);
  }

  private setupAnalyser(stream: MediaStream) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new Ctx();
      }
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") void ctx.resume();

      this.sourceNode?.disconnect();
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      this.sourceNode.connect(this.analyser);
    } catch {
      /* VAD ixtiyoriy — PTT ishlaydi */
    }
  }

  private getRms(): number {
    const analyser = this.analyser;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  startAuto() {
    if (!this.stream || this.autoEnabled) return;
    this.autoEnabled = true;
    this.startVad();
    this.setListening(this.capturing || this.pttActive);
  }

  stopAuto() {
    this.autoEnabled = false;
    this.stopVad();
    if (!this.pttActive && this.capturing && this.captureMode === "auto") {
      this.finishCapture(false);
    }
    if (!this.pttActive && !this.capturing) this.setListening(false);
  }

  private startVad() {
    if (this.vadTimer) return;
    this.vadTimer = setInterval(() => this.tickVad(), VAD_INTERVAL_MS);
  }

  private stopVad() {
    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
  }

  private tickVad() {
    if (!this.autoEnabled || this.pttActive || !this.stream) return;
    const track = this.stream.getAudioTracks()[0];
    if (!track?.enabled) return;

    const rms = this.getRms();
    const now = Date.now();

    if (rms >= SPEECH_RMS) {
      this.speechHits += 1;
      this.silenceSince = 0;
      if (!this.capturing && this.speechHits >= SPEECH_HITS) {
        this.beginCapture("auto");
      }
    } else if (this.capturing && this.captureMode === "auto") {
      this.speechHits = 0;
      if (!this.silenceSince) this.silenceSince = now;
      const silentFor = now - this.silenceSince;
      const duration = now - this.utteranceStart;
      if (silentFor >= SILENCE_MS && duration >= MIN_UTTERANCE_MS) {
        this.finishCapture(true);
      } else if (duration >= MAX_UTTERANCE_MS) {
        this.finishCapture(true);
      }
    } else {
      this.speechHits = 0;
    }
  }

  pressStart() {
    if (!this.stream || this.pttActive) return;
    const track = this.stream.getAudioTracks()[0];
    if (!track?.enabled) return;

    this.pttActive = true;
    this.beginCapture("ptt");
  }

  pressEnd() {
    if (!this.pttActive) return;
    this.pttActive = false;
    const duration = Date.now() - this.utteranceStart;
    if (duration < MIN_UTTERANCE_MS) {
      this.finishCapture(false);
      this.onPttTooShort?.();
      this.setListening(false);
      return;
    }
    this.finishCapture(true);
  }

  private beginCapture(mode: "auto" | "ptt") {
    if (this.capturing || !this.stream) return;
    const track = this.stream.getAudioTracks()[0];
    if (!track?.enabled) return;

    this.captureMode = mode;
    this.mimeType = getPreferredAudioMimeType();
    this.chunks = [];
    this.utteranceStart = Date.now();
    this.capturing = true;
    this.silenceSince = 0;
    this.setListening(true);

    try {
      const audioStream = new MediaStream([track]);
      const recorder = new MediaRecorder(audioStream, { mimeType: this.mimeType });
      const captureMode = mode;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      recorder.onstop = () => {
        this.mediaRecorder = null;
        const parts = this.chunks.filter((c) => c.size > 0);
        this.chunks = [];
        const durationMs = Date.now() - this.utteranceStart;
        const modeAtStop = this.captureMode;
        this.capturing = false;
        this.captureMode = null;

        if (!this.pttActive && this.autoEnabled && modeAtStop === "auto") {
          this.setListening(false);
        } else if (this.pttActive) {
          this.setListening(true);
        } else {
          this.setListening(false);
        }

        if (parts.length === 0 || durationMs < MIN_UTTERANCE_MS) return;
        const blob = new Blob(parts, { type: parts[0]?.type || this.mimeType });
        if (blob.size < MIN_BLOB_BYTES) return;

        if (captureMode === "ptt") {
          this.onPttUtterance?.(blob, durationMs);
        } else {
          this.onUtterance?.(blob, durationMs);
        }
      };

      recorder.onerror = () => {
        this.capturing = false;
        this.captureMode = null;
        this.mediaRecorder = null;
        this.setListening(false);
        this.onRecorderError?.();
      };

      const timeslice = this.mimeType.includes("mp4") || this.mimeType.includes("aac") ? 300 : 200;
      recorder.start(timeslice);
      this.mediaRecorder = recorder;

      if (isIOS()) {
        if (this.iosMaxTimer) clearTimeout(this.iosMaxTimer);
        this.iosMaxTimer = setTimeout(() => {
          this.iosMaxTimer = null;
          if (this.mediaRecorder?.state === "recording") {
            try {
              this.mediaRecorder.requestData();
              this.mediaRecorder.stop();
            } catch {
              /* ignore */
            }
          }
        }, 25_000);
      }
    } catch {
      this.capturing = false;
      this.captureMode = null;
      this.setListening(false);
      this.onRecorderError?.();
    }
  }

  private finishCapture(emit: boolean) {
    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      this.capturing = false;
      this.captureMode = null;
      if (!this.pttActive && !this.autoEnabled) this.setListening(false);
      return;
    }

    if (!emit) {
      recorder.onstop = () => {
        this.chunks = [];
        this.capturing = false;
        this.captureMode = null;
        this.setListening(false);
      };
    } else {
      const oldOnStop = recorder.onstop;
      recorder.onstop = (ev) => {
        oldOnStop?.call(recorder, ev);
      };
    }

    try {
      recorder.requestData();
      recorder.stop();
    } catch {
      this.capturing = false;
      this.captureMode = null;
      this.mediaRecorder = null;
    }

    if (this.iosMaxTimer) {
      clearTimeout(this.iosMaxTimer);
      this.iosMaxTimer = null;
    }
  }

  private setListening(listening: boolean) {
    this.onListeningChange?.(listening);
  }

  stop() {
    this.autoEnabled = false;
    this.pttActive = false;
    this.stopVad();
    this.finishCapture(false);
    this.setListening(false);
    this.speechHits = 0;
    this.silenceSince = 0;
  }

  destroy() {
    if (this.iosMaxTimer) {
      clearTimeout(this.iosMaxTimer);
      this.iosMaxTimer = null;
    }
    this.stop();
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.analyser = null;
    void this.audioCtx?.close();
    this.audioCtx = null;
    this.stream = null;
    this.onUtterance = null;
    this.onPttUtterance = null;
    this.onPttTooShort = null;
    this.onRecorderError = null;
    this.onListeningChange = null;
  }
}
