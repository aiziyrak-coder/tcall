"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { TranslationAudioQueue } from "@/lib/audioQueue";
import {
  getAudioConstraints,
  getPreferredAudioMimeType,
  requestWakeLock,
} from "@/lib/mobile";
import { getPeerConnectionConfig } from "@/lib/webrtc";
import type { RoomParticipant, TranslationPayload } from "@/types/signaling";

export interface TranslationMessage extends TranslationPayload {
  id: string;
  timestamp: number;
}

export type CallStatus = "connecting" | "waiting" | "ringing" | "active" | "ended" | "error";
export type CallError = "media_denied" | "room_full" | "room_error" | "ai_error" | null;
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

const OFFER_RETRY_MS = 8000;
const MAX_OFFER_RETRIES = 3;

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingActiveRef = useRef(false);
  const processingRef = useRef(false);
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
  const offerRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherParticipantRef = useRef<RoomParticipant | null>(null);
  const partnerLanguageRef = useRef<string | null>(null);
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    translationModeRef.current = translationModeState;
    socketRef.current?.emit("update-translation-mode", { mode: translationModeState });
  }, [translationModeState]);

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

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const processAudioChunk = useCallback(
    async (blob: Blob) => {
      if (processingRef.current || isMutedRef.current || !recordingActiveRef.current || !sessionActiveRef.current) return;
      if (partnerLanguageRef.current && partnerLanguageRef.current === userLanguage) return;
      if (blob.size < 500) return;

      processingRef.current = true;
      try {
        const formData = new FormData();
        formData.append("audio", blob, blob.type.includes("mp4") ? "chunk.mp4" : "chunk.webm");
        formData.append("language", userLanguage);

        const res = await apiFetch("/api/openai/transcribe", { method: "POST", body: formData });
        if (!res.ok) return;

        const data = await res.json();
        const text = data.text?.trim();
        if (!text || text === lastTranscriptRef.current) return;

        lastTranscriptRef.current = text;
        if (sessionActiveRef.current && socketRef.current?.connected) {
          socketRef.current.emit("speech-transcript", { text, isFinal: true });
        }

        setTimeout(() => {
          if (lastTranscriptRef.current === text) lastTranscriptRef.current = "";
        }, 4000);
      } catch (e) {
        console.error("Transcribe failed:", e);
      } finally {
        processingRef.current = false;
      }
    },
    [userLanguage]
  );

  const startRecording = useCallback(
    (stream: MediaStream) => {
      if (recorderRef.current || isMutedRef.current) return;
      if (partnerLanguageRef.current && partnerLanguageRef.current === userLanguage) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const audioStream = new MediaStream([audioTrack]);
      const mimeType = getPreferredAudioMimeType();

      try {
        const recorder = new MediaRecorder(audioStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) processAudioChunk(e.data);
        };
        recorder.onerror = () => {
          recordingActiveRef.current = false;
          setIsListening(false);
        };
        recordingActiveRef.current = true;
        recorder.start(700);
        recorderRef.current = recorder;
        setIsListening(true);
      } catch (e) {
        console.error("MediaRecorder failed:", e);
      }
    },
    [processAudioChunk, userLanguage]
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
    },
    [clearOfferRetry, startTimer]
  );

  const createPeerConnection = useCallback(
    (stream: MediaStream, socket: Socket) => {
      const pc = new RTCPeerConnection(getPeerConnectionConfig());

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
          if (streamRef.current && !recorderRef.current) startRecording(streamRef.current);
        } else if (state === "failed") {
          scheduleReofferRef.current();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        if (ice === "connected" || ice === "completed") {
          setCallStatus("active");
          if (streamRef.current && !recorderRef.current && !isMutedRef.current) {
            startRecording(streamRef.current);
          }
        } else if (ice === "failed") {
          scheduleReofferRef.current();
        }
      };

      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
      return pc;
    },
    [attachRemoteTrack, clearOfferRetry, resetPeerConnection, startTimer, startRecording]
  );

  const scheduleReofferRef = useRef<() => void>(() => {});

  const sendOffer = useCallback(
    async (stream: MediaStream, socket: Socket, other: RoomParticipant, forceNew = false) => {
      if (pcRef.current && !forceNew) {
        const state = pcRef.current.connectionState;
        if (state !== "failed" && state !== "closed" && !remoteStreamRef.current) return;
      }
      if (forceNew) resetPeerConnection();
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
    if (!isHost || offerRetryRef.current >= MAX_OFFER_RETRIES) {
      if (offerRetryRef.current >= MAX_OFFER_RETRIES) {
        setCallError("room_error");
        setCallStatus("error");
      }
      return;
    }
    const other = otherParticipantRef.current;
    const stream = streamRef.current;
    const socket = socketRef.current;
    if (!other || !stream || !socket?.connected) return;

    offerRetryRef.current += 1;
    resetPeerConnection();
    setCallStatus("connecting");
    setTimeout(() => {
      if (streamRef.current && socketRef.current?.connected && otherParticipantRef.current) {
        void sendOffer(streamRef.current, socketRef.current, otherParticipantRef.current, true);
      }
    }, 1200);
  }, [isHost, resetPeerConnection, sendOffer]);

  scheduleReofferRef.current = scheduleReoffer;

  const handleRoomUsers = useCallback(
    async (users: RoomParticipant[], stream: MediaStream, socket: Socket) => {
      setParticipants(users);

      if (users.length < 2) {
        setCallStatus(isHost ? "ringing" : "waiting");
        return;
      }

      const other = users.find((u) => u.userId !== userId);
      if (!other) return;

      otherParticipantRef.current = other;
      partnerLanguageRef.current = other.language;

      const pc = pcRef.current;
      const pcBroken = !pc || pc.connectionState === "failed" || pc.connectionState === "closed";
      if (pc && !pcBroken && remoteStreamRef.current) return;

      if (pcBroken) resetPeerConnection();

      const shouldOffer = isHost || (!other.isHost && socket.id! < other.socketId);
      if (!shouldOffer) {
        setCallStatus("connecting");
        return;
      }

      await sendOffer(stream, socket, other, pcBroken);
    },
    [userId, isHost, resetPeerConnection, sendOffer]
  );

  const playRemoteAudio = useCallback(() => {
    const el = remoteAudioRef.current;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.volume = 1;
      el.muted = false;
      void el.play().catch((e) => console.warn("Remote audio play:", e));
    }
  }, []);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!enabled || !userId) return;

    let mounted = true;
    sessionActiveRef.current = true;
    intentionalEndRef.current = false;
    offerRetryRef.current = 0;

    const audioQueue = new TranslationAudioQueue();
    audioQueue.setSpeakingCallback(setIsSpeaking);
    audioQueueRef.current = audioQueue;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
        wakeLockRef.current = await requestWakeLock();
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const socket = io(getSocketUrl(), {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 15,
          timeout: 20000,
          withCredentials: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setSocketConnected(true);
          socket.emit("join-room", {
            roomId,
            userId,
            name: userName,
            language: userLanguage,
            translationMode: translationModeRef.current,
            isHost,
          });
        });

        socket.on("disconnect", () => setSocketConnected(false));
        socket.on("connect_error", () => setSocketConnected(false));
        socket.on("room-full", () => {
          setCallError("room_full");
          setCallStatus("error");
        });

        socket.on("room-users", (users: RoomParticipant[]) => {
          if (streamRef.current) handleRoomUsers(users, streamRef.current, socket);
        });

        socket.on("offer", async ({ offer, senderId }: { offer: RTCSessionDescriptionInit; senderId: string }) => {
          if (!streamRef.current) return;
          if (isHost && makingOfferRef.current) return;
          remoteIdRef.current = senderId;

          try {
            let pc = pcRef.current;
            if (pc?.signalingState === "closed" || pc?.connectionState === "failed") {
              pc = null;
              pcRef.current = null;
            }
            if (!pc) {
              pc = createPeerConnection(streamRef.current, socket);
              pcRef.current = pc;
            }

            if (pc.signalingState === "have-local-offer") {
              if (isHost) return;
              try {
                await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
              } catch {
                resetPeerConnection();
                pc = createPeerConnection(streamRef.current, socket);
                pcRef.current = pc;
              }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await flushIceQueue(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { answer, targetId: senderId });
            setCallStatus("connecting");
            startRecording(streamRef.current);
          } catch (e) {
            console.error("Answer failed:", e);
            resetPeerConnection();
          }
        });

        socket.on("answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          if (!pcRef.current) return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            await flushIceQueue(pcRef.current);
            if (streamRef.current) startRecording(streamRef.current);
          } catch (e) {
            console.error("Answer apply failed:", e);
          }
        });

        socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!pcRef.current?.remoteDescription) {
            iceQueueRef.current.push(candidate);
            return;
          }
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("ICE add failed:", e);
          }
        });

        socket.on("translation", (msg: TranslationPayload) => {
          msgCounterRef.current += 1;
          const entry: TranslationMessage = {
            ...msg,
            id: `${msg.speaker}-${msgCounterRef.current}`,
            timestamp: Date.now(),
          };
          setTranslations((prev) => [...prev.slice(-29), entry]);

          if (msg.audioBase64 && msg.speaker !== userName) {
            playTranslationAudio(msg.audioBase64);
          }
        });

        socket.on("call-ended", () => {
          stopTimer();
          setCallStatus("ended");
        });
        socket.on("call-rejected", () => {
          stopTimer();
          setCallStatus("ended");
        });
        socket.on("call-timeout", () => {
          stopTimer();
          stopRecording();
          resetPeerConnection();
          setCallStatus("ended");
        });
        socket.on("call-cancelled", () => {
          stopTimer();
          stopRecording();
          resetPeerConnection();
          setCallStatus("ended");
        });
        socket.on("user-left", () => {
          if (userLeftTimerRef.current) clearTimeout(userLeftTimerRef.current);
          userLeftTimerRef.current = setTimeout(() => {
            if (mounted) {
              stopTimer();
              resetPeerConnection();
              setCallStatus("ended");
            }
          }, 8000);
        });
      } catch (err) {
        console.error("Media error:", err);
        if (mounted) {
          setCallError("media_denied");
          setCallStatus("error");
          if (isHost && socketRef.current?.connected) {
            socketRef.current.emit("call-cancel", { roomId });
          }
          void apiFetch("/api/calls/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId }),
          });
        }
      }
    }

    init();

    return () => {
      mounted = false;
      sessionActiveRef.current = false;
      stopTimer();
      clearOfferRetry();
      stopRecording();
      audioQueue.stop();
      audioQueueRef.current = null;
      wakeLockRef.current?.release().catch(() => {});
      resetPeerConnection();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const hadRemote = !!remoteStreamRef.current;
      const socket = socketRef.current;

      if (!intentionalEndRef.current) {
        if (isHost && !hadRemote && socket?.connected) {
          socket.emit("call-cancel", { roomId });
        } else if (socket?.connected) {
          socket.emit("call-ended");
        }
        void apiFetch("/api/calls/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
      }

      socket?.disconnect();
      socketRef.current = null;
    };
  }, [
    enabled,
    roomId,
    userId,
    userName,
    userLanguage,
    isHost,
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
  ]);

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
    socketRef.current?.disconnect();
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
    isSpeaking,
    callDuration,
    unlockAudio,
    playRemoteAudio,
    toggleMute,
    setTranslationMode,
    endCall,
  };
}
