"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { TranslationAudioQueue } from "@/lib/audioQueue";
import { isDuplicateTranscript } from "@/lib/call-translation";
import { acquireMicrophoneStream, prefetchMicrophoneAccess } from "@/lib/mic-permission";
import { getPreferredAudioMimeType, isIOS, requestWakeLock } from "@/lib/mobile";
import { unlockAudio } from "@/lib/ringtone";

export type InterpreterSpeaker = "me" | "them";
export type InterpreterActivity = "idle" | "listening" | "processing" | "speaking";

const PARTNER_LANG_KEY = "tcall:interpreter-partner-lang";
/** Kamida shuncha ms ushlab turish kerak — aks holda tarjima qilinmaydi */
const MIN_RECORD_MS = 1600;
const MIN_BLOB_BYTES = 1800;

function loadPartnerLang(defaultLang: string): string {
  if (typeof window === "undefined") return defaultLang === "uz" ? "en" : "uz";
  try {
    const saved = localStorage.getItem(PARTNER_LANG_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return defaultLang === "uz" ? "en" : defaultLang === "en" ? "uz" : "en";
}

export function useLiveInterpreter(userLanguage: string) {
  const [myLang, setMyLang] = useState(userLanguage);
  const [theirLang, setTheirLang] = useState(() => loadPartnerLang(userLanguage));
  const [sessionActive, setSessionActive] = useState(false);
  const [recording, setRecording] = useState<InterpreterSpeaker | null>(null);
  const [activity, setActivity] = useState<InterpreterActivity>("idle");
  const [activeTargetLang, setActiveTargetLang] = useState<string | null>(null);
  const [entries, setEntries] = useState<{ original: string; translated: string }[]>([]);
  const [error, setError] = useState("");
  const [micDenied, setMicDenied] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSpeakerRef = useRef<InterpreterSpeaker | null>(null);
  const pointerHeldRef = useRef(false);
  const pressLockRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const recordDurationMsRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const audioQueueRef = useRef<TranslationAudioQueue | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastTranscriptRef = useRef("");
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const iosMaxRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myLangRef = useRef(myLang);
  const theirLangRef = useRef(theirLang);
  const entriesRef = useRef(entries);

  useEffect(() => {
    myLangRef.current = myLang;
  }, [myLang]);

  useEffect(() => {
    theirLangRef.current = theirLang;
    try {
      localStorage.setItem(PARTNER_LANG_KEY, theirLang);
    } catch {
      /* ignore */
    }
  }, [theirLang]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    setMyLang(userLanguage);
  }, [userLanguage]);

  useEffect(() => {
    void unlockAudio();
    void prefetchMicrophoneAccess();
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const releaseMic = useCallback(() => {
    clearStopTimer();
    if (recorderRef.current?.state !== "inactive") {
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    recordingSpeakerRef.current = null;
    setRecording(null);
  }, [clearStopTimer]);

  const stopSession = useCallback(() => {
    pointerHeldRef.current = false;
    pressLockRef.current = false;
    releaseMic();
    audioQueueRef.current?.stop();
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setSessionActive(false);
    setActivity("idle");
    setActiveTargetLang(null);
    processingRef.current = false;
  }, [releaseMic]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (iosMaxRecordTimerRef.current) {
        clearTimeout(iosMaxRecordTimerRef.current);
        iosMaxRecordTimerRef.current = null;
      }
      stopSession();
      audioQueueRef.current = null;
    };
  }, [stopSession]);

  const ensureAudioQueue = useCallback(() => {
    if (!audioQueueRef.current) {
      const queue = new TranslationAudioQueue();
      queue.setEnabled(true);
      queue.setSpeakingCallback((speaking) => {
        setActivity(speaking ? "speaking" : "idle");
        if (!speaking) setActiveTargetLang(null);
      });
      audioQueueRef.current = queue;
    }
    return audioQueueRef.current;
  }, []);

  const processRecording = useCallback(
    async (blob: Blob, speaker: InterpreterSpeaker) => {
      if (processingRef.current) return;
      if (blob.size < MIN_BLOB_BYTES) {
        setError("no_speech");
        setActivity("idle");
        return;
      }

      const sourceLang = speaker === "me" ? myLangRef.current : theirLangRef.current;
      const targetLang = speaker === "me" ? theirLangRef.current : myLangRef.current;

      processingRef.current = true;
      setActivity("processing");
      setActiveTargetLang(targetLang);
      setError("");

      try {
        const formData = new FormData();
        const mime = blob.type || mimeTypeRef.current;
        const isMp4 = mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a");
        formData.append("audio", blob, isMp4 ? "speech.mp4" : "speech.webm");
        formData.append("sourceLang", sourceLang);
        formData.append("targetLang", targetLang);
        formData.append("withSpeech", "true");
        formData.append("recordMs", String(recordDurationMsRef.current));

        const res = await apiFetch("/api/interpreter/process", { method: "POST", body: formData });
        const data = await res.json();
        if (!mountedRef.current) return;

        if (res.status === 422 || data.error === "no_speech") {
          setError("no_speech");
          setActivity("idle");
          setActiveTargetLang(null);
          return;
        }

        if (res.status === 429 || data.error === "rate_limit") {
          setError("rate_limit");
          setActivity("idle");
          setActiveTargetLang(null);
          return;
        }

        if (!res.ok) {
          setError("error");
          setActivity("idle");
          setActiveTargetLang(null);
          return;
        }

        const original = String(data.original || "").trim();
        const translated = String(data.translated || "").trim();
        if (!original) {
          setActivity("idle");
          setActiveTargetLang(null);
          return;
        }
        if (isDuplicateTranscript(lastTranscriptRef.current, original)) {
          setActivity("idle");
          setActiveTargetLang(null);
          return;
        }

        lastTranscriptRef.current = original;
        setTimeout(() => {
          if (lastTranscriptRef.current === original) lastTranscriptRef.current = "";
        }, 4000);

        setEntries((prev) => [...prev.slice(-19), { original, translated: translated || original }]);

        if (data.audioBase64) {
          const queue = ensureAudioQueue();
          await queue.unlock();
          setActiveTargetLang(targetLang);
          queue.enqueue(data.audioBase64);
        } else if (translated) {
          setError("error");
          setActivity("idle");
          setActiveTargetLang(null);
        } else {
          setActivity("idle");
          setActiveTargetLang(null);
        }
      } catch (e) {
        console.error("Interpreter process failed:", e);
        setError("error");
        setActivity("idle");
        setActiveTargetLang(null);
      } finally {
        if (mountedRef.current) processingRef.current = false;
      }
    },
    [ensureAudioQueue]
  );

  const startSession = useCallback(async (): Promise<boolean> => {
    if (streamRef.current?.getAudioTracks().some((t) => t.readyState === "live")) return true;
    setMicDenied(false);
    setError("");

    try {
      const queue = ensureAudioQueue();
      await queue.unlock();

      const stream = await acquireMicrophoneStream(true);
      streamRef.current = stream;

      const lock = await requestWakeLock();
      if (lock) wakeLockRef.current = lock;

      setSessionActive(true);
      return true;
    } catch {
      setMicDenied(true);
      return false;
    }
  }, [ensureAudioQueue]);

  const startRecorderInternal = useCallback(
    (speaker: InterpreterSpeaker) => {
      if (!pointerHeldRef.current) {
        setActivity("idle");
        return;
      }
      if (!streamRef.current || recordingSpeakerRef.current) return;

      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (!audioTrack?.enabled) return;

      audioQueueRef.current?.stop();
      setActivity("listening");

      const mimeType = getPreferredAudioMimeType();
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];
      recordingSpeakerRef.current = speaker;
      recordStartedAtRef.current = Date.now();
      setRecording(speaker);
      setError("");

      try {
        const audioStream = new MediaStream([audioTrack]);
        const recorder = new MediaRecorder(audioStream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const sp = recordingSpeakerRef.current;
          const durationMs = Date.now() - recordStartedAtRef.current;
          recordingSpeakerRef.current = null;
          setRecording(null);
          recorderRef.current = null;

          if (!sp) {
            setActivity("idle");
            return;
          }

          const parts = chunksRef.current.filter((c) => c.size > 0);
          chunksRef.current = [];

          if (parts.length === 0 || durationMs < MIN_RECORD_MS) {
            setActivity("idle");
            if (durationMs < MIN_RECORD_MS) setError("no_speech");
            return;
          }

          const blobType = parts[0]?.type || mimeTypeRef.current;
          const blob = new Blob(parts, { type: blobType });

          if (blob.size < MIN_BLOB_BYTES) {
            setActivity("idle");
            setError("no_speech");
            return;
          }

          recordDurationMsRef.current = durationMs;
          void processRecording(blob, sp);
        };

        recorder.onerror = () => {
          recordingSpeakerRef.current = null;
          setRecording(null);
          recorderRef.current = null;
          setActivity("idle");
        };

        const timeslice = mimeType.includes("mp4") || mimeType.includes("aac") ? 350 : 200;
        recorder.start(timeslice);
        recorderRef.current = recorder;

        if (isIOS()) {
          if (iosMaxRecordTimerRef.current) clearTimeout(iosMaxRecordTimerRef.current);
          iosMaxRecordTimerRef.current = setTimeout(() => {
            iosMaxRecordTimerRef.current = null;
            if (recorderRef.current?.state === "recording") {
              try {
                recorderRef.current.requestData();
                recorderRef.current.stop();
              } catch {
                /* ignore */
              }
            }
          }, 25_000);
        }
      } catch {
        recordingSpeakerRef.current = null;
        setRecording(null);
        setActivity("idle");
        setError("error");
      }
    },
    [processRecording]
  );

  const stopRecorderInternal = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    clearStopTimer();

    const elapsed = Date.now() - recordStartedAtRef.current;

    if (elapsed < MIN_RECORD_MS) {
      recordingSpeakerRef.current = null;
      chunksRef.current = [];
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
      setRecording(null);
      recorderRef.current = null;
      setActivity("idle");
      setError("no_speech");
      return;
    }

    try {
      recorder.requestData();
      recorder.stop();
    } catch {
      recordingSpeakerRef.current = null;
      setRecording(null);
      setActivity("idle");
    }
  }, [clearStopTimer]);

  const beginRecording = useCallback(
    async (speaker: InterpreterSpeaker) => {
      if (processingRef.current) return;
      pointerHeldRef.current = true;

      const arm = () => {
        if (!pointerHeldRef.current) {
          setActivity("idle");
          return;
        }
        startRecorderInternal(speaker);
      };

      if (streamRef.current) {
        arm();
        return;
      }

      setActivity("listening");
      const ok = await startSession();
      if (ok && pointerHeldRef.current) arm();
      else {
        pointerHeldRef.current = false;
        setActivity("idle");
      }
    },
    [startRecorderInternal, startSession]
  );

  const endRecording = useCallback(() => {
    pointerHeldRef.current = false;
    stopRecorderInternal();
  }, [stopRecorderInternal]);

  const pressStart = useCallback(
    (speaker: InterpreterSpeaker) => {
      if (pressLockRef.current || processingRef.current) return;
      pressLockRef.current = true;
      void beginRecording(speaker);
    },
    [beginRecording]
  );

  const pressEnd = useCallback(() => {
    pressLockRef.current = false;
    endRecording();
  }, [endRecording]);

  const swapLanguages = useCallback(() => {
    setMyLang(theirLangRef.current);
    setTheirLang(myLangRef.current);
  }, []);

  return {
    myLang,
    theirLang,
    setMyLang,
    setTheirLang,
    sessionActive,
    recording,
    activity,
    activeTargetLang,
    error,
    setError,
    micDenied,
    startSession,
    stopSession,
    pressStart,
    pressEnd,
    swapLanguages,
  };
}
