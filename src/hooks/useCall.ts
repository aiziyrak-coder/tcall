"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api";
import { waitForSharedSocket } from "@/lib/call-socket";
import { requestWakeLock } from "@/lib/mobile";
import { normalizeLanguageCode } from "@/lib/lang-validators";
import {
  CallTranslationEngine,
  type TranslationActivity,
  type TranslationErrorCode,
} from "@/lib/call-translation-engine";
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
import type { TranslationPayload, TranslationMessage, RoomParticipant } from "@/types/signaling";

export type { TranslationMessage };

function notifyCallsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tcall:calls-changed"));
  }
}

export type CallStatus = "connecting" | "waiting" | "ringing" | "active" | "ended" | "error";
export type CallError = "media_denied" | "room_full" | "room_error" | "ai_error" | null;
export type MicStatus = "checking" | "pending" | "requesting" | "granted" | "denied" | "tap";
export type TranslationMode = "text";

interface UseCallOptions {
  roomId: string;
  userId: string;
  userName: string;
  userLanguage: string;
  translationMode: TranslationMode;
  isHost: boolean;
  enabled: boolean;
}

const OFFER_RETRY_MS = 15_000;
const MAX_OFFER_RETRIES = 24;
const RELAY_FALLBACK_AFTER = 2;
const USER_LEFT_GRACE_MS = 30_000;
const ICE_DISCONNECT_RECOVERY_MS = 18_000;
const CONNECTION_DISCONNECT_RECOVERY_MS = 14_000;

async function optimizeAudioSender(pc: RTCPeerConnection) {
  try {
    const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = 28_000;
    params.encodings[0].priority = "high";
    params.encodings[0].networkPriority = "high";
    await sender.setParameters(params);
  } catch {
    /* brauzer qo'llamasa ham davom */
  }
}

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
  const [translationModeState] = useState<TranslationMode>("text");
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [callError, setCallError] = useState<CallError>(null);
  const [isListening, setIsListening] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [translationActivity, setTranslationActivity] = useState<TranslationActivity>("idle");
  const [translationError, setTranslationError] = useState<TranslationErrorCode | null>(null);
  const [micStatus, setMicStatus] = useState<MicStatus>("pending");

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const translationEngineRef = useRef<CallTranslationEngine | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const intentionalEndRef = useRef(false);
  const makingOfferRef = useRef(false);
  const isMutedRef = useRef(false);
  const translationModeRef = useRef<TranslationMode>("text");
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
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
  const remoteAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudioGainRef = useRef<GainNode | null>(null);
  const reofferDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceDisconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    translationModeRef.current = "text";
  }, []);

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
        callStatusRef.current === "waiting" ||
        callStatusRef.current === "active"
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
    if (reofferDelayTimerRef.current) {
      clearTimeout(reofferDelayTimerRef.current);
      reofferDelayTimerRef.current = null;
    }
    if (iceDisconnectTimerRef.current) {
      clearTimeout(iceDisconnectTimerRef.current);
      iceDisconnectTimerRef.current = null;
    }
    if (connectionRecoveryTimerRef.current) {
      clearTimeout(connectionRecoveryTimerRef.current);
      connectionRecoveryTimerRef.current = null;
    }
    iceQueueRef.current = [];
    remoteStreamRef.current = null;
    setRemoteStream(null);
    remoteAudioSourceRef.current?.disconnect();
    remoteAudioSourceRef.current = null;
    remoteAudioGainRef.current = null;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [clearOfferRetry]);

  const needsTranslation = useCallback(() => {
    const partnerLang = partnerLanguageRef.current;
    if (!partnerLang) return false;
    return normalizeLanguageCode(partnerLang) !== normalizeLanguageCode(userLanguage);
  }, [userLanguage]);

  const startTranslation = useCallback(() => {
    if (!needsTranslation() || isMutedRef.current) return;
    translationEngineRef.current?.start();
  }, [needsTranslation]);

  const stopTranslation = useCallback(() => {
    translationEngineRef.current?.stop();
  }, []);

  const unlockAudio = useCallback(async () => {
    return unlockBrowserAudio();
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
          if (connectionRecoveryTimerRef.current) {
            clearTimeout(connectionRecoveryTimerRef.current);
            connectionRecoveryTimerRef.current = null;
          }
          setCallStatus("active");
          startTimer();
          clearOfferRetry();
          clearSlowHint();
          void optimizeAudioSender(pc);
          if (streamRef.current) startTranslation();
        } else if (state === "failed") {
          scheduleReofferRef.current();
        } else if (state === "disconnected") {
          startSlowHint();
          if (!connectionRecoveryTimerRef.current) {
            connectionRecoveryTimerRef.current = setTimeout(() => {
              connectionRecoveryTimerRef.current = null;
              const current = pcRef.current?.connectionState;
              if (current === "disconnected" || current === "failed") {
                scheduleReofferRef.current();
              }
            }, CONNECTION_DISCONNECT_RECOVERY_MS);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        if (ice === "connected" || ice === "completed") {
          setCallStatus("active");
          clearSlowHint();
          if (iceDisconnectTimerRef.current) {
            clearTimeout(iceDisconnectTimerRef.current);
            iceDisconnectTimerRef.current = null;
          }
          if (connectionRecoveryTimerRef.current) {
            clearTimeout(connectionRecoveryTimerRef.current);
            connectionRecoveryTimerRef.current = null;
          }
          if (streamRef.current && !isMutedRef.current) {
            startTranslation();
          }
        } else if (ice === "failed") {
          scheduleReofferRef.current();
        } else if (ice === "disconnected") {
          startSlowHint();
          if (iceDisconnectTimerRef.current) clearTimeout(iceDisconnectTimerRef.current);
          iceDisconnectTimerRef.current = setTimeout(() => {
            iceDisconnectTimerRef.current = null;
            const current = pcRef.current?.iceConnectionState;
            if (current === "disconnected" || current === "failed") {
              scheduleReofferRef.current();
            }
          }, ICE_DISCONNECT_RECOVERY_MS);
        }
      };

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
        void optimizeAudioSender(pc);
      }
      return pc;
    },
    [attachRemoteTrack, clearOfferRetry, clearSlowHint, startTimer, startTranslation]
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
      if (!relayFallbackRef.current) {
        relayFallbackRef.current = true;
        offerRetryRef.current = RELAY_FALLBACK_AFTER;
      } else {
        offerRetryRef.current = 0;
      }
      startSlowHint();
    }
    const other = otherParticipantRef.current;
    const stream = streamRef.current;
    const socket = socketRef.current;
    if (!other || !stream || !socket?.connected) return;

    offerRetryRef.current += 1;
    resetPeerConnection();
    setCallStatus("connecting");
    startSlowHint();

    if (reofferDelayTimerRef.current) clearTimeout(reofferDelayTimerRef.current);
    reofferDelayTimerRef.current = setTimeout(() => {
      reofferDelayTimerRef.current = null;
      const s = streamRef.current;
      const sock = socketRef.current;
      const peer = otherParticipantRef.current;
      if (!s || !sock?.connected || !peer) return;

      if (optsRef.current.isHost || serverIsHostRef.current) {
        void sendOffer(s, sock, peer, true);
      } else {
        sock.emit("request-reoffer", { targetId: peer.socketId });
      }
    }, 2500);
  }, [resetPeerConnection, sendOffer, startSlowHint]);

  const endCallDueToPartnerLeft = useCallback(() => {
    stopTranslation();
    stopTimer();
    resetPeerConnection();
    setCallStatus("ended");
    notifyCallsChanged();
  }, [stopTranslation, stopTimer, resetPeerConnection]);

  const schedulePartnerLeftEnd = useCallback(() => {
    if (userLeftTimerRef.current) return;
    userLeftTimerRef.current = setTimeout(() => {
      userLeftTimerRef.current = null;
      endCallDueToPartnerLeft();
    }, USER_LEFT_GRACE_MS);
  }, [endCallDueToPartnerLeft]);

  const clearPartnerLeftTimer = useCallback(() => {
    if (userLeftTimerRef.current) {
      clearTimeout(userLeftTimerRef.current);
      userLeftTimerRef.current = null;
    }
  }, []);

  scheduleReofferRef.current = scheduleReoffer;

  const handleRoomUsers = useCallback(
    async (users: RoomParticipant[], stream: MediaStream, socket: Socket) => {
      setParticipants(users);
      const { userId: uid, isHost: host } = optsRef.current;

      const self = users.find((u) => u.userId === uid);
      if (self) serverIsHostRef.current = !!self.isHost;

      if (users.length < 2) {
        if (otherParticipantRef.current && callStatusRef.current === "active") {
          schedulePartnerLeftEnd();
          return;
        }
        setCallStatus(self?.isHost || host ? "ringing" : "waiting");
        return;
      }

      clearPartnerLeftTimer();

      const other = users.find((u) => u.userId !== uid);
      if (!other) return;

      otherParticipantRef.current = other;
      partnerLanguageRef.current = other.language;

      if (
        normalizeLanguageCode(other.language) === normalizeLanguageCode(optsRef.current.userLanguage)
      ) {
        stopTranslation();
      } else if (
        streamRef.current &&
        !isMutedRef.current &&
        (callStatusRef.current === "active" || callStatusRef.current === "connecting")
      ) {
        translationEngineRef.current?.attachStream(streamRef.current);
        startTranslation();
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
    [resetPeerConnection, sendOffer, stopTranslation, startTranslation, schedulePartnerLeftEnd, clearPartnerLeftTimer]
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
      remoteAudioSourceRef.current?.disconnect();
      remoteAudioSourceRef.current = null;
      remoteAudioGainRef.current = null;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(gain);
      gain.connect(ctx.destination);
      remoteAudioSourceRef.current = source;
      remoteAudioGainRef.current = gain;
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

  const handlersRef = useRef({
    handleRoomUsers,
    createPeerConnection,
    flushIceQueue,
    startTranslation,
    stopTranslation,
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
    startTranslation,
    stopTranslation,
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

    const engine = new CallTranslationEngine({
      getUserName: () => optsRef.current.userName,
      getUserLang: () => optsRef.current.userLanguage,
      getPartnerLang: () => partnerLanguageRef.current,
      getSocket: () => socketRef.current,
      onActivity: setTranslationActivity,
      onListening: setIsListening,
      onTranslation: (entry) => setTranslations((prev) => [...prev.slice(-39), entry]),
      onError: (code, source) => {
        if (code === "no_speech" && source === "auto") return;
        setTranslationError(code);
      },
    });
    translationEngineRef.current = engine;

    async function startWithStream(stream: MediaStream) {
      if (!mounted || sessionStartedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      sessionStartedRef.current = true;

      try {
        await unlockBrowserAudio();
        engine.attachStream(stream);

        wakeLockRef.current = await requestWakeLock();
        if (!mounted) {
          sessionStartedRef.current = false;
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setMicStatus("granted");
        setCallStatus("connecting");
        startSlowHint();

        const socket = await waitForSharedSocket();
        if (!mounted) {
          sessionStartedRef.current = false;
          return;
        }
        socketRef.current = socket;

        const joinRoom = () => {
          const o = optsRef.current;
          socket.emit("join-room", {
            roomId: o.roomId,
            userId: o.userId,
            name: o.userName,
            language: o.userLanguage,
            translationMode: "text",
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
          } catch (e) {
            console.error("Answer failed:", e);
            handlersRef.current.resetPeerConnection();
            scheduleReofferRef.current();
          }
        };

        const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          if (!pcRef.current) return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            await handlersRef.current.flushIceQueue(pcRef.current);
          } catch (e) {
            console.error("Answer apply failed:", e);
            scheduleReofferRef.current();
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
          translationEngineRef.current?.handleRemoteTranslation(msg);
        };

        const onTranslationError = ({ error }: { error?: string }) => {
          if (error === "rate_limit") setTranslationError("rate_limit");
          else setTranslationError("error");
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
          handlersRef.current.stopTranslation();
          setCallStatus("ended");
          notifyCallsChanged();
        };

        const onCallRejected = () => {
          handlersRef.current.stopTimer();
          handlersRef.current.stopTranslation();
          setCallStatus("ended");
          notifyCallsChanged();
        };

        const onCallTimeout = () => {
          handlersRef.current.stopTimer();
          handlersRef.current.stopTranslation();
          handlersRef.current.resetPeerConnection();
          setCallStatus("ended");
          notifyCallsChanged();
        };

        const onCallCancelled = () => {
          handlersRef.current.stopTimer();
          handlersRef.current.stopTranslation();
          handlersRef.current.resetPeerConnection();
          setCallStatus("ended");
          notifyCallsChanged();
        };

        const onUserLeft = () => {
          schedulePartnerLeftEnd();
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
        socket.on("translation-error", onTranslationError);
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
          socket.off("translation-error", onTranslationError);
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
        wakeLockRef.current?.release().catch(() => {});
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
        callStatusRef.current === "active"
      ) {
        handlersRef.current.startTranslation();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      mounted = false;

      handlersRef.current.stopTimer();
      handlersRef.current.clearOfferRetry();
      handlersRef.current.stopTranslation();
      engine.destroy();
      translationEngineRef.current = null;
      detachSocketRef.current?.();
      detachSocketRef.current = null;

      // User-left timer tozalash (memory leak oldini olish)
      if (userLeftTimerRef.current) {
        clearTimeout(userLeftTimerRef.current);
        userLeftTimerRef.current = null;
      }

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
        translationEngineRef.current = null;
        wakeLockRef.current?.release().catch(() => {});
        remoteAudioCtxRef.current?.close().catch(() => {});
        remoteAudioCtxRef.current = null;
        remoteAudioSourceRef.current?.disconnect();
        remoteAudioSourceRef.current = null;
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

        if (socket?.connected && !intentionalEndRef.current) {
          socket.emit("leave-room", { roomId: rid });
        }
        socketRef.current = null;
      }, 600);
    };
  }, [enabled, roomId, userId]);

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

    if (nextMuted) {
      stopTranslation();
      translationEngineRef.current?.setMuted(true);
    } else {
      translationEngineRef.current?.setMuted(false);
      startTranslation();
    }
  }, [isMuted, stopTranslation, startTranslation]);

  const pressTranslateStart = useCallback(() => {
    translationEngineRef.current?.pressStart();
  }, []);

  const pressTranslateEnd = useCallback(() => {
    translationEngineRef.current?.pressEnd();
  }, []);

  const clearTranslationError = useCallback(() => {
    setTranslationError(null);
  }, []);

  const endCall = useCallback(() => {
    intentionalEndRef.current = true;
    stopTimer();
    stopTranslation();
    translationEngineRef.current?.destroy();
    translationEngineRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    resetPeerConnection();
    const host = serverIsHostRef.current || optsRef.current.isHost;
    if (host && !remoteStreamRef.current && socketRef.current?.connected) {
      socketRef.current.emit("call-cancel", { roomId });
    } else {
      socketRef.current?.emit("call-ended");
    }
    socketRef.current?.emit("leave-room", { roomId });
    void apiFetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    }).then(() => notifyCallsChanged());
    detachSocketRef.current?.();
    detachSocketRef.current = null;
    setCallStatus("ended");
  }, [stopTranslation, resetPeerConnection, stopTimer, roomId]);

  const partner = participants.find((p) => p.userId !== userId);

  return {
    remoteStream,
    remoteAudioRef,
    participants,
    partner,
    translations,
    isMuted,
    translationMode: translationModeState,
    translationActivity,
    translationError,
    callStatus,
    callError,
    isListening,
    socketConnected,
    connectionSlow,
    callDuration,
    micStatus,
    unlockAudio,
    playRemoteAudio,
    toggleMute,
    pressTranslateStart,
    pressTranslateEnd,
    clearTranslationError,
    endCall,
    requestMicrophone,
  };
}
