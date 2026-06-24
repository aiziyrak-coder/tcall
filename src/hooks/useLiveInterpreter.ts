"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { TranslationAudioQueue } from "@/lib/audioQueue";
import { isDuplicateTranscript } from "@/lib/call-translation";
import { acquireMicrophoneStream } from "@/lib/mic-permission";
import { getPreferredAudioMimeType, isIOS, requestWakeLock } from "@/lib/mobile";

export type InterpreterSpeaker = "me" | "them";

export interface InterpreterEntry {
  id: string;
  speaker: InterpreterSpeaker;
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

const PARTNER_LANG_KEY = "tcall:interpreter-partner-lang";

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
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [entries, setEntries] = useState<InterpreterEntry[]>([]);
  const [error, setError] = useState("");
  const [micDenied, setMicDenied] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSpeakerRef = useRef<InterpreterSpeaker | null>(null);
  const audioQueueRef = useRef<TranslationAudioQueue | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastTranscriptRef = useRef("");
  const processingRef = useRef(false);
  const myLangRef = useRef(myLang);
  const theirLangRef = useRef(theirLang);
  const voiceEnabledRef = useRef(voiceEnabled);
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
    voiceEnabledRef.current = voiceEnabled;
    audioQueueRef.current?.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    setMyLang(userLanguage);
  }, [userLanguage]);

  const releaseMic = useCallback(() => {
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
  }, []);

  const stopSession = useCallback(() => {
    releaseMic();
    audioQueueRef.current?.stop();
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setSessionActive(false);
    setProcessing(false);
    processingRef.current = false;
  }, [releaseMic]);

  useEffect(() => {
    return () => {
      stopSession();
      audioQueueRef.current = null;
    };
  }, [stopSession]);

  const ensureAudioQueue = useCallback(() => {
    if (!audioQueueRef.current) {
      const queue = new TranslationAudioQueue();
      queue.setSpeakingCallback(setSpeaking);
      queue.setEnabled(voiceEnabledRef.current);
      audioQueueRef.current = queue;
    }
    return audioQueueRef.current;
  }, []);

  const processRecording = useCallback(
    async (blob: Blob, speaker: InterpreterSpeaker) => {
      if (processingRef.current) return;
      if (blob.size < 600) return;

      const sourceLang = speaker === "me" ? myLangRef.current : theirLangRef.current;
      const targetLang = speaker === "me" ? theirLangRef.current : myLangRef.current;

      processingRef.current = true;
      setProcessing(true);
      setError("");

      try {
        const recentContext = entriesRef.current
          .slice(-6)
          .flatMap((e) => [e.original, e.translated])
          .filter(Boolean);

        const formData = new FormData();
        const isMp4 = blob.type.includes("mp4") || blob.type.includes("aac");
        formData.append("audio", blob, isMp4 ? "speech.mp4" : "speech.webm");
        formData.append("sourceLang", sourceLang);
        formData.append("targetLang", targetLang);
        formData.append("withSpeech", voiceEnabledRef.current ? "true" : "false");
        if (recentContext.length) formData.append("context", JSON.stringify(recentContext));

        const res = await apiFetch("/api/interpreter/process", { method: "POST", body: formData });
        const data = await res.json();

        if (res.status === 422 || data.error === "no_speech") {
          setError("no_speech");
          return;
        }

        if (!res.ok) {
          setError(data.error || "error");
          return;
        }

        const original = String(data.original || "").trim();
        const translated = String(data.translated || "").trim();
        if (!original) return;
        if (isDuplicateTranscript(lastTranscriptRef.current, original)) return;

        lastTranscriptRef.current = original;
        setTimeout(() => {
          if (lastTranscriptRef.current === original) lastTranscriptRef.current = "";
        }, 4000);

        const entry: InterpreterEntry = {
          id: `${Date.now()}-${speaker}`,
          speaker,
          original,
          translated: translated || original,
          sourceLang: data.sourceLang || sourceLang,
          targetLang: data.targetLang || targetLang,
          timestamp: Date.now(),
        };

        setEntries((prev) => [...prev.slice(-49), entry]);

        if (data.audioBase64 && voiceEnabledRef.current) {
          const queue = ensureAudioQueue();
          await queue.unlock();
          queue.enqueue(data.audioBase64);
        }
      } catch (e) {
        console.error("Interpreter process failed:", e);
        setError("error");
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [ensureAudioQueue]
  );

  const startSession = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    setMicDenied(false);
    setError("");

    try {
      const queue = ensureAudioQueue();
      await queue.unlock();

      const stream = await acquireMicrophoneStream();
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

  const beginRecording = useCallback(
    async (speaker: InterpreterSpeaker) => {
      if (processingRef.current) return;
      if (recordingSpeakerRef.current) return;

      const ok = await startSession();
      if (!ok || !streamRef.current) return;

      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (!audioTrack?.enabled) return;

      audioQueueRef.current?.stop();

      const mimeType = getPreferredAudioMimeType();
      chunksRef.current = [];
      recordingSpeakerRef.current = speaker;
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
          recordingSpeakerRef.current = null;
          setRecording(null);
          recorderRef.current = null;

          if (!sp || chunksRef.current.length === 0) return;
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          void processRecording(blob, sp);
        };

        recorder.onerror = () => {
          recordingSpeakerRef.current = null;
          setRecording(null);
          recorderRef.current = null;
        };

        recorder.start();
        recorderRef.current = recorder;

        if (isIOS()) {
          setTimeout(() => {
            if (recorderRef.current?.state === "recording") {
              try {
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
        setError("error");
      }
    },
    [processRecording, startSession]
  );

  const endRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      try {
        recorder.stop();
      } catch {
        recordingSpeakerRef.current = null;
        setRecording(null);
      }
    }
  }, []);

  const swapLanguages = useCallback(() => {
    setMyLang(theirLangRef.current);
    setTheirLang(myLangRef.current);
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
    lastTranscriptRef.current = "";
  }, []);

  return {
    myLang,
    theirLang,
    setMyLang,
    setTheirLang,
    sessionActive,
    recording,
    processing,
    speaking,
    voiceEnabled,
    setVoiceEnabled,
    entries,
    error,
    setError,
    micDenied,
    startSession,
    stopSession,
    beginRecording,
    endRecording,
    swapLanguages,
    clearHistory,
  };
}
