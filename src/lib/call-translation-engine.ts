import type { Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api";
import { TranslationAudioQueue } from "@/lib/audioQueue";
import { isDuplicateTranscript } from "@/lib/call-translation";
import { normalizeLanguageCode } from "@/lib/lang-validators";
import { CallUtteranceRecorder } from "@/lib/call-utterance-recorder";
import type { TranslationPayload, TranslationMessage } from "@/types/signaling";

export type TranslationMode = "text" | "voice";
export type TranslationActivity = "idle" | "listening" | "processing" | "speaking";
export type TranslationErrorCode = "no_speech" | "rate_limit" | "error" | "same_lang";
export type TranslationErrorSource = "ptt" | "auto" | "relay";

export interface CallTranslationEngineOptions {
  getUserName: () => string;
  getUserLang: () => string;
  getPartnerLang: () => string | null;
  getSocket: () => Socket | null;
  getTranslationMode: () => TranslationMode;
  onActivity: (activity: TranslationActivity) => void;
  onListening: (listening: boolean) => void;
  onSpeaking: (speaking: boolean) => void;
  onTranslation: (entry: TranslationMessage) => void;
  onError: (code: TranslationErrorCode, source?: TranslationErrorSource) => void;
  duckRemote: (duck: boolean) => void;
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Qo'ng'iroq tarjimoni — interpreter API + socket relay */
export class CallTranslationEngine {
  private recorder = new CallUtteranceRecorder();
  private audioQueue = new TranslationAudioQueue();
  private processing = false;
  private muted = false;
  private active = false;
  private lastTranscript = "";
  private opts: CallTranslationEngineOptions;

  constructor(opts: CallTranslationEngineOptions) {
    this.opts = opts;

    this.recorder.onUtterance = (blob, durationMs) => {
      void this.processUtterance(blob, durationMs, "auto");
    };
    this.recorder.onPttUtterance = (blob, durationMs) => {
      void this.processUtterance(blob, durationMs, "ptt");
    };
    this.recorder.onPttTooShort = () => {
      this.opts.onError("no_speech", "ptt");
    };
    this.recorder.onRecorderError = () => {
      this.opts.onError("error", "auto");
    };
    this.recorder.onListeningChange = (listening) => {
      if (!this.processing && !this.audioQueue.isActive()) {
        this.opts.onListening(listening);
        if (!listening && !this.audioQueue.isActive()) {
          this.opts.onActivity("idle");
        } else if (listening) {
          this.opts.onActivity("listening");
        }
      }
    };

    this.audioQueue.setSpeakingCallback((speaking) => {
      this.opts.onSpeaking(speaking);
      if (speaking) {
        this.opts.onActivity("speaking");
        this.recorder.stopAuto();
      } else {
        this.resumeAutoListen();
      }
    });
    this.audioQueue.setRemoteDuckCallback(opts.duckRemote);
  }

  needsTranslation(): boolean {
    const partner = this.opts.getPartnerLang();
    if (!partner) return false;
    return normalizeLanguageCode(partner) !== normalizeLanguageCode(this.opts.getUserLang());
  }

  attachStream(stream: MediaStream) {
    this.recorder.attach(stream);
  }

  async unlockAudio() {
    return this.audioQueue.unlock();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.recorder.stop();
      this.active = false;
    } else if (this.active && this.needsTranslation()) {
      this.recorder.startAuto();
    }
  }

  setTranslationMode(mode: TranslationMode) {
    const voice = mode === "voice";
    this.audioQueue.setEnabled(voice);
    if (!voice) this.audioQueue.stop();
  }

  start() {
    if (this.muted || !this.opts.getPartnerLang()) return;
    if (!this.needsTranslation()) return;
    this.active = true;
    this.recorder.startAuto();
  }

  stop() {
    this.active = false;
    this.processing = false;
    this.recorder.stopAuto();
    this.recorder.stop();
    this.audioQueue.stop();
    this.opts.onActivity("idle");
    this.opts.onListening(false);
    this.opts.onSpeaking(false);
  }

  pressStart() {
    if (this.muted) return;
    const partner = this.opts.getPartnerLang();
    if (!partner) {
      this.opts.onError("error", "ptt");
      return;
    }
    if (!this.needsTranslation()) {
      this.opts.onError("same_lang", "ptt");
      return;
    }
    this.active = true;
    this.recorder.pressStart();
  }

  pressEnd() {
    this.recorder.pressEnd();
  }

  handleRemoteTranslation(msg: TranslationPayload) {
    const userName = this.opts.getUserName();
    if (msg.speaker === userName) return;

    const entry: TranslationMessage = {
      ...msg,
      id: nextId(msg.speaker),
      timestamp: Date.now(),
    };
    this.opts.onTranslation(entry);

    if (msg.audioBase64 && this.opts.getTranslationMode() === "voice") {
      void this.audioQueue.unlock();
      this.audioQueue.enqueue(msg.audioBase64);
    }
  }

  private resumeAutoListen() {
    if (this.processing || this.audioQueue.isActive()) return;
    if (this.active && !this.muted && this.needsTranslation()) {
      this.opts.onActivity("idle");
      this.recorder.startAuto();
    } else {
      this.opts.onActivity("idle");
    }
  }

  private async processUtterance(
    blob: Blob,
    durationMs: number,
    source: TranslationErrorSource
  ) {
    if (this.processing || this.muted || !this.needsTranslation()) return;

    const partnerLang = this.opts.getPartnerLang();
    if (!partnerLang) return;

    const sourceLang = this.opts.getUserLang();
    const targetLang = partnerLang;
    const userName = this.opts.getUserName();

    this.processing = true;
    this.recorder.stopAuto();
    this.opts.onActivity("processing");
    this.opts.onListening(false);

    try {
      const mime = blob.type || "audio/webm";
      const isMp4 = mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a");
      const formData = new FormData();
      formData.append("audio", blob, isMp4 ? "speech.mp4" : "speech.webm");
      formData.append("sourceLang", sourceLang);
      formData.append("targetLang", targetLang);
      formData.append("withSpeech", "false");
      formData.append("recordMs", String(durationMs));

      const res = await apiFetch("/api/interpreter/process", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 422 || data.error === "no_speech") {
        this.opts.onError("no_speech", source);
        return;
      }
      if (res.status === 429 || data.error === "rate_limit") {
        this.opts.onError("rate_limit", source);
        return;
      }
      if (!res.ok) {
        this.opts.onError("error", source);
        return;
      }

      const original = String(data.original || "").trim();
      const translated = String(data.translated || "").trim();
      if (!original) {
        this.opts.onError("no_speech", source);
        return;
      }
      if (isDuplicateTranscript(this.lastTranscript, original)) return;

      this.lastTranscript = original;
      setTimeout(() => {
        if (this.lastTranscript === original) this.lastTranscript = "";
      }, 5000);

      const socket = this.opts.getSocket();
      if (!socket?.connected) {
        this.opts.onError("error", "relay");
        return;
      }

      const entry: TranslationMessage = {
        id: nextId("self"),
        original,
        translated: translated || original,
        sourceLang: data.sourceLang || sourceLang,
        targetLang,
        speaker: userName,
        isFinal: true,
        timestamp: Date.now(),
        outgoing: true,
      };
      this.opts.onTranslation(entry);

      socket.emit("call-translation", {
          original,
          translated: translated || original,
          sourceLang: data.sourceLang || sourceLang,
          targetLang,
        });
    } catch (e) {
      console.error("Call translation failed:", e);
      this.opts.onError("error", source);
    } finally {
      this.processing = false;
      this.resumeAutoListen();
    }
  }

  destroy() {
    this.stop();
    this.recorder.destroy();
  }
}
