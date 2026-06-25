"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api";
import { waitForSharedSocket } from "@/lib/call-socket";
import { TranslationAudioQueue } from "@/lib/audioQueue";
import {
  getPreferredAudioMimeType,
  requestWakeLock,
  isIOS,
} from "@/lib/mobile";
import { isValidTranscript, isDuplicateTranscript } from "@/lib/call-translation";
import {
  markMicGranted,
  queryMicPermission,
  requestMicrophoneStream,
  wasMicGrantedBefore,
  acquireMicrophoneStream,
  watchMicPermission,
  takeCachedMicStream,
} from "@/lib/mic-permission";
import {
  playMediaStreamOnElement,
  unlockBrowserAudio,
} from "@/lib/audio-unlock";
import { getPeerConnectionConfig } from "@/lib/webrtc";
import type { RoomParticipant, TranslationPayload } from "@/types/signaling";

export interface TranslationMessage extends TranslationPayload {
  id: string;
  timestamp: number;
}

export type CallStatus = "connecting" | "waiting" | "ringing" | "active" | "ended" | "error";
export type CallError = "media_denied" | "room_full" | "room_error" | "ai_error" | null;
export type MicStatus = "checking" | "pending" | "requesting" | "granted" | "denied" | "tap";
export type TranslationMode = "text" | "voice";

interface UseCallOptions {
  roomId: string;
  userId: string;
  userName: string;
  userLanguage: string;
  translationMode: TranslationMode;
  isHost: boolean;
  enabled: boolean;
}

const OFFER_RETRY_MS = 12_000;
const MAX_OFFER_RETRIES = 8;
const RELAY_FALLBACK_AFTER = 3;

export function useCall({
  roomId,
  userId,
  userName,
  userLanguage,
  translationMode,
  isHost,
  enabled,
}: UseCallOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [translations, setTranslations] = useState<TranslationMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [translationModeState, setTranslationModeState] = useState<TranslationMode>(translationMode);
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [callError, setCallError] = useState<CallError>(null);
  const [isListening, setIsListening] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [micStatus, setMicStatus] = useState<MicStatus>("pending");

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingActiveRef = useRef(false);
  const processingRef = useRef(false);
  const chunkQueueRef = useRef<Blob[]>([]);
  const recorderRestartTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTranscriptRef = useRef("");
  const remoteIdRef = useRef<string | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const intentionalEndRef = useRef(false);
  const makingOfferRef = useRef(false);
  const msgCounterRef = useRef(0);
  const isMutedRef = useRef(false);
  const translationModeRef = useRef<TranslationMode>(translationMode);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const audioQueueRef = useRef<TranslationAudioQueue | null>(null);
  const offerRetryRef = useRef(0);
  const relayFallbackRef = useRef(false);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherParticipantRef = useRef<RoomParticipant | null>(null);
  const partnerLanguageRef = useRef<string | null>(null);
  const callStatusRef = useRef<CallStatus>("connecting");
  const sessionActiveRef = useRef(false);
  const startSessionRef = useRef<(stream: MediaStream) => Promise<void>>(async () => {});
  const sessionStartedRef = useRef(false);
  const remoteAudioCtxRef = useRef<AudioContext | null>(null);
  const playRemoteAudioRef = useRef<() => void>(() => {});
  const optsRef = useRef({ roomId, userId, userName, userLanguage, isHost });
  optsRef.current = { roomId, userId, userName, userLanguage, isHost };

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const serverIsHostRef = useRef(isHost);
  const sessionIdRef = useRef(0);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detachSocketRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    serverIsHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    translationModeRef.current = translationModeState;
    socketRef.current?.emit("update-translation-mode", { mode: translationModeState });
  }, [translationModeState]);

  const clearSlowHint = useCallback(() => {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
      slowHintTimerRef.current = null;
    }
    setConnectionSlow(false);
  }, []);

  const startSlowHint = useCallback(() => {
    if (slowHintTimerRef.current) return;
    slowHintTimerRef.current = setTimeout(() => {
      slowHintTimerRef.current = null;
      if (
        callStatusRef.current === "connecting" ||
        callStatusRef.current === "ringing" ||
        callStatusRef.current === "waiting"
      ) {
        setConnectionSlow(true);
      }
    }, 8000);
  }, []);

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection) => {
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("ICE candidate error:", e);
      }
    }
  }, []);

  const clearOfferRetry = useCallback(() => {
    if (offerRetryTimerRef.current) {
      clearTimeout(offerRetryTimerRef.current);
      offerRetryTimerRef.current = null;
    }
  }, []);

  const resetPeerConnection = useCallback(() => {
    clearOfferRetry();
    iceQueueRef.current = [];
    remoteStreamRef.current = null;
    setRemoteStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [clearOfferRetry]);

  const clearRecorderRestartTimer = useCallback(() => {
    if (recorderRestartTimerRef.current) {
      clearInterval(recorderRestartTimerRef.current);
      recorderRestartTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;
    clearRecorderRestartTimer();
    chunkQueueRef.current = [];
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, [clearRecorderRestartTimer]);

  const needsTranslation = useCallback(() => {
    const partnerLang = partnerLanguageRef.current;
    return !partnerLang || partnerLang !== userLanguage;
  }, [userLanguage]);

  const processAudioChunkInternal = useCallback(
    async (blob: Blob) => {
      if (isMutedRef.current || !recordingActiveRef.current || !sessionActiveRef.current) return;
      if (partnerLanguageRef.current && partnerLanguageRef.current === userLanguage) return;

      const isMp4 = blob.type.includes("mp4") || blob.type.includes("aac");
      const minSize = isMp4 ? 1400 : 400;
      if (blob.size < minSize) return;

      try {
        const formData = new FormData();
        formData.append("audio", blob, isMp4 ? "chunk.mp4" : "chunk.webm");
        formData.append("language", userLanguage);

        const res = await apiFetch("/api/openai/transcribe", { method: "POST", body: formData });
        if (!res.ok) return;

        const data = await res.json();
        const text = data.text?.trim();
        if (!text || !isValidTranscript(text)) return;
        if (isDuplicateTranscript(lastTranscriptRef.current, text)) return;

        lastTranscriptRef.current = text;
        if (sessionActiveRef.current && socketRef.current?.connected) {
          socketRef.current.emit("speech-transcript", { text, isFinal: true });
          msgCounterRef.current += 1;
          setTranslations((prev) => [
            ...prev.slice(-29),
            {
              id: `self-${msgCounterRef.current}`,
              original: text,
              translated: text,
              sourceLang: userLanguage,
              targetLang: userLanguage,
              speaker: optsRef.current.userName,
              isFinal: true,
              timestamp: Date.now(),
            },
          ]);
        }

        setTimeout(() => {
          if (lastTranscriptRef.current === text) lastTranscriptRef.current = "";
        }, 5000);
      } catch (e) {
        console.error("Transcribe failed:", e);
      }
    },
    [userLanguage]
  );

  const drainChunkQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (chunkQueueRef.current.length > 0) {
        const blob = chunkQueueRef.current.shift()!;
        await processAudioChunkInternal(blob);
      }
    } finally {
      processingRef.current = false;
    }
  }, [processAudioChunkInternal]);

  const enqueueAudioChunk = useCallback(
    (blob: Blob) => {
      if (processingRef.current && chunkQueueRef.current.length >= 6) {
        chunkQueueRef.current.shift();
      }
      chunkQueueRef.current.push(blob);
      void drainChunkQueue();
    },
    [drainChunkQueue]
  );

  const startRecording = useCallback(
    (stream: MediaStream) => {
      if (recorderRef.current || isMutedRef.current) return;
      if (partnerLanguageRef.current && partnerLanguageRef.current === userLanguage) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack?.enabled) return;

      const audioStream = new MediaStream([audioTrack]);
      const mimeType = getPreferredAudioMimeType();

      try {
        const recorder = new MediaRecorder(audioStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) enqueueAudioChunk(e.data);
        };
        recorder.onerror = () => {
          recordingActiveRef.current = false;
          setIsListening(false);
        };
        recorder.onstop = () => {
          if (recordingActiveRef.current && streamRef.current && !isMutedRef.current && needsTranslation()) {
            recorderRef.current = null;
            startRecording(streamRef.current);
          }
        };
        recordingActiveRef.current = true;
        const timeslice = mimeType.includes("mp4") || mimeType.includes("aac") ? 1200 : 700;
        recorder.start(timeslice);
        recorderRef.current = recorder;
        setIsListening(true);

        clearRecorderRestartTimer();
        if (isIOS()) {
          recorderRestartTimerRef.current = setInterval(() => {
            const r = recorderRef.current;
            if (r?.state === "recording") {
              try { r.stop(); } catch { /* ignore */ }
            }
          }, 25_000);
        }
      } catch (e) {
        console.error("MediaRecorder failed:", e);
      }
    },
    [enqueueAudioChunk, needsTranslation, clearRecorderRestartTimer]
  );

  const playTranslationAudio = useCallback((audioBase64: string) => {
    if (translationModeRef.current !== "voice") return;
    audioQueueRef.current?.enqueue(audioBase64);
  }, []);

  const unlockAudio = useCallback(async () => {
    return audioQueueRef.current?.unlock() ?? false;
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const attachRemoteTrack = useCallback(
    (event: RTCTrackEvent) => {
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = event.streams[0] ?? new MediaStream();
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      }
      if (event.track && !stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
        setRemoteStream(new MediaStream(stream.getTracks()));
      }
      setCallStatus("active");
      startTimer();
      clearOfferRetry();
      clearSlowHint();
      playRemoteAudioRef.current();
    },
    [clearOfferRetry, clearSlowHint, startTimer]
  );

  const createPeerConnection = useCallback(
    (stream: MediaStream, socket: Socket) => {
      const pc = new RTCPeerConnection(
        getPeerConnectionConfig({ preferRelay: relayFallbackRef.current })
      );

      pc.onicecandidate = (event) => {
        if (event.candidate && remoteIdRef.current) {
          socket.emit("ice-candidate", { candidate: event.candidate, targetId: remoteIdRef.current });
        }
      };

      pc.ontrack = attachRemoteTrack;

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          setCallStatus("active");
          startTimer();
          clearOfferRetry();
          clearSlowHint();
          if (streamRef.current && !recorderRef.current) startRecording(streamRef.current);
        } else if (state === "failed" || state === "disconnected") {
          scheduleReofferRef.current();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        if (ice === "connected" || ice === "completed") {
          setCallStatus("active");
          clearSlowHint();
          if (streamRef.current && !recorderRef.current && !isMutedRef.current) {
            startRecording(streamRef.current);
          }
        } else if (ice === "failed") {
          scheduleReofferRef.current();
        } else if (ice === "disconnected") {
          setTimeout(() => {
            if (pcRef.current?.iceConnectionState === "disconnected") {
              scheduleReofferRef.current();
            }
          }, 4000);
        }
      };

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }
      return pc;
    },
    [attachRemoteTrack, clearOfferRetry, clearSlowHint, startTimer, startRecording]
  );

  const scheduleReofferRef = useRef<() => void>(() => {});

  const sendOffer = useCallback(
    async (stream: MediaStream, socket: Socket, other: RoomParticipant, forceNew = false) => {
      if (remoteStreamRef.current) return;
      if (pcRef.current && (forceNew || !remoteStreamRef.current)) {
        const state = pcRef.current.connectionState;
        if (forceNew || state === "failed" || state === "closed" || state === "connecting") {
          resetPeerConnection();
        } else if (state === "connected") {
          return;
        } else if (makingOfferRef.current) {
          return;
        }
      }
      remoteIdRef.current = other.socketId;

      try {
        makingOfferRef.current = true;
        const pc = createPeerConnection(stream, socket);
        pcRef.current = pc;

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { offer, targetId: other.socketId });
        setCallStatus("connecting");

        clearOfferRetry();
        offerRetryTimerRef.current = setTimeout(() => {
          if (!remoteStreamRef.current && offerRetryRef.current < MAX_OFFER_RETRIES) {
            offerRetryRef.current += 1;
            void sendOffer(stream, socket, other, true);
          }
        }, OFFER_RETRY_MS);
      } catch (e) {
        console.error("Offer failed:", e);
        setCallError("room_error");
        setCallStatus("error");
      } finally {
        makingOfferRef.current = false;
      }
    },
    [createPeerConnection, resetPeerConnection, clearOfferRetry]
  );

  const scheduleReoffer = useCallback(() => {
    if (offerRetryRef.current >= MAX_OFFER_RETRIES) {
      setCallError("room_error");
      setCallStatus("error");
      return;
    }
    if (offerRetryRef.current >= RELAY_FALLBACK_AFTER && !relayFallbackRef.current) {
      relayFallbackRef.current = true;
    }
    const other = otherParticipantRef.current;
    const stream = streamRef.current;
    const socket = socketRef.current;
    if (!other || !stream || !socket?.connected) return;

    offerRetryRef.current += 1;
    resetPeerConnection();
    setCallStatus("connecting");
    startSlowHint();

    setTimeout(() => {
      const s = streamRef.current;
      const sock = socketRef.current;
      const peer = otherParticipantRef.current;
      if (!s || !sock?.connected || !peer) return;

      if (optsRef.current.isHost || serverIsHostRef.current) {
        void sendOffer(s, sock, peer, true);
      } else {
        sock.emit("request-reoffer", { targetId: peer.socketId });
      }
    }, 2000);
  }, [resetPeerConnection, sendOffer, startSlowHint]);

  scheduleReofferRef.current = scheduleReoffer;

  const handleRoomUsers = useCallback(
    async (users: RoomParticipant[], stream: MediaStream, socket: Socket) => {
      setParticipants(users);
      const { userId: uid, isHost: host } = optsRef.current;

      const self = users.find((u) => u.userId === uid);
      if (self) serverIsHostRef.current = !!self.isHost;

      if (users.length < 2) {
        setCallStatus(self?.isHost || host ? "ringing" : "waiting");
        return;
      }

      const other = users.find((u) => u.userId !== uid);
      if (!other) return;

      otherParticipantRef.current = other;
      partnerLanguageRef.current = other.language;

      if (other.language === optsRef.current.userLanguage) {
        handlersRef.current.stopRecording();
      } else if (
        streamRef.current &&
        !recorderRef.current &&
        !isMutedRef.current &&
        (callStatusRef.current === "active" || callStatusRef.current === "connecting")
      ) {
        handlersRef.current.startRecording(streamRef.current);
      }

      const pc = pcRef.current;
      const pcBroken = !pc || pc.connectionState === "failed" || pc.connectionState === "closed";
      if (pc && !pcBroken && remoteStreamRef.current) return;

      if (pcBroken) resetPeerConnection();

      const iAmHost = self?.isHost ?? serverIsHostRef.current;
      const shouldOffer = iAmHost || (!other.isHost && socket.id! < other.socketId);
      if (!shouldOffer) {
        setCallStatus("connecting");
        return;
      }

      await new Promise((r) => setTimeout(r, 400));
      await sendOffer(stream, socket, other, true);
    },
    [resetPeerConnection, sendOffer]
  );

  const playRemoteAudio = useCallback(async () => {
    const stream = remoteStreamRef.current;
    if (!stream) return;

    const el = remoteAudioRef.current;
    if (el) {
      const ok = await playMediaStreamOnElement(el, stream);
      if (ok) return;
    }

    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!remoteAudioCtxRef.current || remoteAudioCtxRef.current.state === "closed") {
        remoteAudioCtxRef.current = new Ctx();
      }
      const ctx = remoteAudioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(ctx.destination);
    } catch (e) {
      console.warn("Remote audio fallback:", e);
    }
  }, []);

  playRemoteAudioRef.current = () => {
    void playRemoteAudio();
  };

  useEffect(() => {
    if (remoteStream) {
      void playRemoteAudio();
    }
  }, [remoteStream, playRemoteAudio]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.volume = isSpeaking ? 0.25 : 1;
  }, [isSpeaking]);

  const handlersRef = useRef({
    handleRoomUsers,
    createPeerConnection,
    flushIceQueue,
    startRecording,
    stopRecording,
    playTranslationAudio,
    resetPeerConnection,
    clearOfferRetry,
    startTimer,
    stopTimer,
    sendOffer,
  });
  handlersRef.current = {
    handleRoomUsers,
    createPeerConnection,
    flushIceQueue,
    startRecording,
    stopRecording,
    playTranslationAudio,
    resetPeerConnection,
    clearOfferRetry,
    startTimer,
    stopTimer,
    sendOffer,
  };

  useEffect(() => {
    if (!enabled || !userId) return;

    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    const mySessionId = ++sessionIdRef.current;
    let mounted = true;
    sessionActiveRef.current = true;
    intentionalEndRef.current = false;
    offerRetryRef.current = 0;
    relayFallbackRef.current = false;
    sessionStartedRef.current = false;
    serverIsHostRef.current = isHost;

    const audioQueue = new TranslationAudioQueue();
    audioQueue.setSpeakingCallback(setIsSpeaking);
    audioQueueRef.current = audioQueue;

    async function startWithStream(stream: MediaStream) {
      if (!mounted || sessionStartedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      sessionStartedRef.current = true;

      try {
        await unlockBrowserAudio();
        void audioQueue.unlock();

        wakeLockRef.current = await requestWakeLock();
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setMicStatus("granted");
        setCallStatus("connecting");
        startSlowHint();

        const socket = await waitForSharedSocket();
        if (!mounted) return;
        socketRef.current = socket;

        const joinRoom = () => {
          const o = optsRef.current;
          socket.emit("join-room", {
            roomId: o.roomId,
            userId: o.userId,
            name: o.userName,
            language: o.userLanguage,
            translationMode: translationModeRef.current,
            isHost: o.isHost,
          });
        };

        const onConnect = () => {
          setSocketConnected(true);
          joinRoom();
        };

        const onDisconnect = () => {
          setSocketConnected(false);
          startSlowHint();
        };
        const onConnectError = () => {
          setSocketConnected(false);
          startSlowHint();
        };

        const onRoomUsers = (users: RoomParticipant[]) => {
          if (streamRef.current) {
            void handlersRef.current.handleRoomUsers(users, streamRef.current, socket);
          }
        };

        const onOffer = async ({ offer, senderId }: { offer: RTCSessionDescriptionInit; senderId: string }) => {
          if (!streamRef.current) return;
          const polite = !serverIsHostRef.current;
          if (makingOfferRef.current && !polite) return;
          remoteIdRef.current = senderId;

          try {
            handlersRef.current.resetPeerConnection();
            const pc = handlersRef.current.createPeerConnection(streamRef.current, socket);
            pcRef.current = pc;

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await handlersRef.current.flushIceQueue(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { answer, targetId: senderId });
            setCallStatus("connecting");
            handlersRef.current.startRecording(streamRef.current);
          } catch (e) {
            console.error("Answer failed:", e);
            handlersRef.current.resetPeerConnection();
          }
        };

        const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          if (!pcRef.current) return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            await handlersRef.current.flushIceQueue(pcRef.current);
            if (streamRef.current) handlersRef.current.startRecording(streamRef.current);
          } catch (e) {
            console.error("Answer apply failed:", e);
          }
        };

        const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!pcRef.current?.remoteDescription) {
            iceQueueRef.current.push(candidate);
            return;
          }
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("ICE add failed:", e);
          }
        };

        const onReoffer = () => {
          if (!serverIsHostRef.current || !streamRef.current || !otherParticipantRef.current) return;
          void handlersRef.current.sendOffer(
            streamRef.current,
            socket,
            otherParticipantRef.current,
            true
          );
        };

        const onTranslation = (msg: TranslationPayload) => {
          msgCounterRef.current += 1;
          const entry: TranslationMessage = {
            ...msg,
            id: `${msg.speaker}-${msgCounterRef.current}`,
            timestamp: Date.now(),
          };
          setTranslations((prev) => [...prev.slice(-29), entry]);
          if (msg.audioBase64 && msg.speaker !== optsRef.current.userName) {
            handlersRef.current.playTranslationAudio(msg.audioBase64);
          }
        };

        const onRoomFull = () => {
          setCallError("room_full");
          setCallStatus("error");
        };

        const onRoomError = ({ message }: { message?: string }) => {
          console.warn("Room join error:", message);
          setCallError("room_error");
          setCallStatus("error");
        };

        const onCallEnded = () => {
          handlersRef.current.stopTimer();
          setCallStatus("ended");
        };

        const onCallRejected = () => {
          handlersRef.current.stopTimer();
          setCallStatus("ended");
        };

        const onCallTimeout = () => {
          handlersRef.current.stopTimer();
          handlersRef.current.stopRecording();
          handlersRef.current.resetPeerConnection();
          setCallStatus("ended");
        };

        const onCallCancelled = () => {
          handlersRef.current.stopTimer();
          handlersRef.current.stopRecording();
          handlersRef.current.resetPeerConnection();
          setCallStatus("ended");
        };

        const onUserLeft = () => {
          if (userLeftTimerRef.current) clearTimeout(userLeftTimerRef.current);
          userLeftTimerRef.current = setTimeout(() => {
            if (mounted) {
              handlersRef.current.stopTimer();
              handlersRef.current.resetPeerConnection();
              setCallStatus("ended");
            }
          }, 8000);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);
        socket.on("room-full", onRoomFull);
        socket.on("room-error", onRoomError);
        socket.on("room-users", onRoomUsers);
        socket.on("offer", onOffer);
        socket.on("answer", onAnswer);
        socket.on("ice-candidate", onIce);
        socket.on("request-reoffer", onReoffer);
        socket.on("translation", onTranslation);
        socket.on("call-ended", onCallEnded);
        socket.on("call-rejected", onCallRejected);
        socket.on("call-timeout", onCallTimeout);
        socket.on("call-cancelled", onCallCancelled);
        socket.on("user-left", onUserLeft);

        socket.io.on("reconnect", onConnect);

        setSocketConnected(socket.connected);
        joinRoom();

        detachSocketRef.current = () => {
          socket.off("connect", onConnect);
          socket.off("disconnect", onDisconnect);
          socket.off("connect_error", onConnectError);
          socket.off("room-full", onRoomFull);
          socket.off("room-error", onRoomError);
          socket.off("room-users", onRoomUsers);
          socket.off("offer", onOffer);
          socket.off("answer", onAnswer);
          socket.off("ice-candidate", onIce);
          socket.off("request-reoffer", onReoffer);
          socket.off("translation", onTranslation);
          socket.off("call-ended", onCallEnded);
          socket.off("call-rejected", onCallRejected);
          socket.off("call-timeout", onCallTimeout);
          socket.off("call-cancelled", onCallCancelled);
          socket.off("user-left", onUserLeft);
          socket.io.off("reconnect", onConnect);
        };
      } catch (err) {
        console.error("Call session error:", err);
        sessionStartedRef.current = false;
        if (mounted) {
          setCallError("room_error");
          setCallStatus("error");
        }
      }
    }

    startSessionRef.current = startWithStream;

    async function bootstrap() {
      watchMicPermission(() => {
        if (mounted) void tryAcquire(false);
      });

      await tryAcquire(true);
    }

    async function tryAcquire(isInitial: boolean) {
      const perm = await queryMicPermission();
      if (perm === "denied") {
        if (mounted) {
          setMicStatus("denied");
          setCallError("media_denied");
          setCallStatus("error");
        }
        return;
      }

      const cached = takeCachedMicStream();
      if (cached) {
        markMicGranted();
        await startWithStream(cached);
        return;
      }

      try {
        const stream = await acquireMicrophoneStream();
        await startWithStream(stream);
        return;
      } catch (err) {
        const needsGesture =
          err instanceof Error && err.message === "NEEDS_GESTURE";
        if (needsGesture || wasMicGrantedBefore() || perm === "granted") {
          if (mounted) setMicStatus("tap");
          return;
        }
        if (isInitial && mounted) setMicStatus("pending");
      }
    }

    void bootstrap();

    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        streamRef.current &&
        !isMutedRef.current &&
        callStatusRef.current === "active" &&
        !recorderRef.current
      ) {
        handlersRef.current.startRecording(streamRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      mounted = false;

      handlersRef.current.stopTimer();
      handlersRef.current.clearOfferRetry();
      handlersRef.current.stopRecording();
      audioQueue.stop();
      detachSocketRef.current?.();
      detachSocketRef.current = null;

      const hadRemote = !!remoteStreamRef.current;
      const socket = socketRef.current;
      const host = serverIsHostRef.current || optsRef.current.isHost;
      const rid = optsRef.current.roomId;
      const shouldEnd = !intentionalEndRef.current;
      const closedSessionId = mySessionId;

      cleanupTimerRef.current = setTimeout(() => {
        cleanupTimerRef.current = null;
        if (closedSessionId !== sessionIdRef.current) return;

        sessionActiveRef.current = false;
        sessionStartedRef.current = false;
        clearSlowHint();
        audioQueueRef.current = null;
        wakeLockRef.current?.release().catch(() => {});
        remoteAudioCtxRef.current?.close().catch(() => {});
        remoteAudioCtxRef.current = null;
        handlersRef.current.resetPeerConnection();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (shouldEnd) {
          if (host && !hadRemote && callStatusRef.current === "ringing" && socket?.connected) {
            socket.emit("call-cancel", { roomId: rid });
          } else if (socket?.connected) {
            socket.emit("call-ended");
          }
          void apiFetch("/api/calls/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: rid }),
          });
        }

        if (socket?.connected) {
          socket.emit("leave-room", { roomId: rid });
        }
        socketRef.current = null;
      }, 600);
    };
  }, [enabled, roomId, userId, isHost]);

  const requestMicrophone = useCallback(async () => {
    setMicStatus("requesting");
    try {
      await unlockBrowserAudio();
      const cached = takeCachedMicStream();
      const stream = cached ?? (await requestMicrophoneStream());
      await startSessionRef.current(stream);
      return true;
    } catch (err) {
      console.error("Mic permission error:", err);
      const perm = await queryMicPermission();
      if (perm === "denied") {
        setMicStatus("denied");
        setCallError("media_denied");
        setCallStatus("error");
      } else if (wasMicGrantedBefore()) {
        setMicStatus("tap");
      } else {
        setMicStatus("pending");
      }
      return false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);

    if (nextMuted) stopRecording();
    else if (streamRef.current) startRecording(streamRef.current);
  }, [isMuted, stopRecording, startRecording]);

  const setTranslationMode = useCallback(async (mode: TranslationMode) => {
    setTranslationModeState(mode);
    translationModeRef.current = mode;
    socketRef.current?.emit("update-translation-mode", { mode });

    await apiFetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translationMode: mode }),
    }).catch(() => {});

    if (mode === "text") audioQueueRef.current?.stop();
  }, []);

  const endCall = useCallback(() => {
    intentionalEndRef.current = true;
    stopTimer();
    stopRecording();
    audioQueueRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    resetPeerConnection();
    if (isHost && !remoteStreamRef.current && socketRef.current?.connected) {
      socketRef.current.emit("call-cancel", { roomId });
    } else {
      socketRef.current?.emit("call-ended");
    }
    socketRef.current?.emit("leave-room", { roomId });
    void apiFetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    detachSocketRef.current?.();
    detachSocketRef.current = null;
    setCallStatus("ended");
  }, [stopRecording, resetPeerConnection, stopTimer, isHost, roomId]);

  const partner = participants.find((p) => p.userId !== userId);

  return {
    remoteStream,
    remoteAudioRef,
    participants,
    partner,
    translations,
    isMuted,
    translationMode: translationModeState,
    callStatus,
    callError,
    isListening,
    socketConnected,
    connectionSlow,
    isSpeaking,
    callDuration,
    micStatus,
    unlockAudio,
    playRemoteAudio,
    toggleMute,
    setTranslationMode,
    endCall,
    requestMicrophone,
  };
}
