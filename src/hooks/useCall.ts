"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch, getSocketUrl } from "@/lib/api";
import type { RoomParticipant, TranslationPayload } from "@/types/signaling";

export interface TranslationMessage extends TranslationPayload {
  id: string;
  timestamp: number;
}

export type CallStatus = "connecting" | "waiting" | "active" | "ended" | "error";
export type CallError = "media_denied" | "room_full" | "room_error" | "ai_error" | null;

interface UseCallOptions {
  roomId: string;
  userId: string;
  userName: string;
  userLanguage: string;
  isHost: boolean;
  enabled: boolean;
}

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export function useCall({ roomId, userId, userName, userLanguage, isHost, enabled }: UseCallOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [translations, setTranslations] = useState<TranslationMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [callError, setCallError] = useState<CallError>(null);
  const [isListening, setIsListening] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
  const voiceEnabledRef = useRef(true);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setIsListening(false);
  }, []);

  const processAudioChunk = useCallback(
    async (blob: Blob) => {
      if (processingRef.current || isMutedRef.current || !recordingActiveRef.current) return;
      if (blob.size < 1500) return;

      processingRef.current = true;
      try {
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        formData.append("language", userLanguage);

        const res = await apiFetch("/api/openai/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) return;

        const data = await res.json();
        const text = data.text?.trim();
        if (!text || text === lastTranscriptRef.current) return;

        lastTranscriptRef.current = text;
        socketRef.current?.emit("speech-transcript", { text, isFinal: true });

        // Reset after 5s to allow same phrase again
        setTimeout(() => {
          if (lastTranscriptRef.current === text) lastTranscriptRef.current = "";
        }, 5000);
      } catch (e) {
        console.error("OpenAI transcribe failed:", e);
      } finally {
        processingRef.current = false;
      }
    },
    [userLanguage]
  );

  const startRecording = useCallback(
    (stream: MediaStream) => {
      if (recorderRef.current || isMutedRef.current) return;

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const audioStream = new MediaStream([audioTrack]);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

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
        recorder.start(3000);
        recorderRef.current = recorder;
        setIsListening(true);
      } catch (e) {
        console.error("MediaRecorder failed:", e);
      }
    },
    [processAudioChunk]
  );

  const playTranslationAudio = useCallback((audioBase64: string) => {
    if (!voiceEnabledRef.current) return;
      try {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioPlayerRef.current = audio;
        audio.play().catch(() => {});
      } catch {
        /* ignore playback errors */
      }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream, socket: Socket) => {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteIdRef.current) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          targetId: remoteIdRef.current,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setCallStatus("active");
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallStatus("active");
      if (pc.connectionState === "failed") {
        setCallError("room_error");
        setCallStatus("error");
      }
    };

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    return pc;
  }, []);

  const handleRoomUsers = useCallback(
    async (users: RoomParticipant[], stream: MediaStream, socket: Socket) => {
      setParticipants(users);

      if (users.length < 2) {
        setCallStatus("waiting");
        return;
      }

      if (pcRef.current) return;

      const other = users.find((u) => u.userId !== userId);
      if (!other) return;

      remoteIdRef.current = other.socketId;

      const shouldOffer = isHost || socket.id! < other.socketId;
      if (!shouldOffer) return;

      try {
        makingOfferRef.current = true;
        const pc = createPeerConnection(stream, socket);
        pcRef.current = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { offer, targetId: other.socketId });
        setCallStatus("connecting");
      } catch (e) {
        console.error("Offer creation failed:", e);
        setCallError("room_error");
        setCallStatus("error");
      } finally {
        makingOfferRef.current = false;
      }
    },
    [userId, isHost, createPeerConnection]
  );

  useEffect(() => {
    if (!enabled || !userId) return;

    let mounted = true;
    intentionalEndRef.current = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setLocalStream(stream);

        const socket = io(getSocketUrl(), {
          path: "/socket.io",
          autoConnect: true,
          withCredentials: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", {
            roomId,
            userId,
            name: userName,
            language: userLanguage,
            isHost,
          });
        });

        socket.on("room-full", () => {
          setCallError("room_full");
          setCallStatus("error");
        });

        socket.on("room-users", (users: RoomParticipant[]) => {
          if (streamRef.current) {
            handleRoomUsers(users, streamRef.current, socket);
          }
        });

        socket.on("offer", async ({ offer, senderId }: { offer: RTCSessionDescriptionInit; senderId: string }) => {
          if (!streamRef.current) return;
          remoteIdRef.current = senderId;

          try {
            let pc = pcRef.current;

            if (pc) {
              if (pc.signalingState !== "stable" && makingOfferRef.current) {
                await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
              }
              if (pc.signalingState === "closed") {
                pc = null;
                pcRef.current = null;
              }
            }

            if (!pc) {
              pc = createPeerConnection(streamRef.current, socket);
              pcRef.current = pc;
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
            setCallError("room_error");
            setCallStatus("error");
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

        socket.on("call-ended", () => setCallStatus("ended"));
        socket.on("user-left", () => setCallStatus("ended"));
      } catch (err) {
        console.error("Media access error:", err);
        if (mounted) {
          setCallError("media_denied");
          setCallStatus("error");
        }
      }
    }

    init();

    return () => {
      mounted = false;
      stopRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      pcRef.current?.close();
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (intentionalEndRef.current) {
        socketRef.current?.emit("call-ended");
      }
      socketRef.current?.disconnect();
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
  ]);

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);

    if (nextMuted) {
      stopRecording();
    } else if (streamRef.current) {
      startRecording(streamRef.current);
    }
  }, [isMuted, stopRecording, startRecording]);

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const nextOff = !isVideoOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setIsVideoOff(nextOff);
  }, [isVideoOff]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((v) => {
      voiceEnabledRef.current = !v;
      return !v;
    });
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  }, []);

  const endCall = useCallback(() => {
    intentionalEndRef.current = true;
    stopRecording();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    socketRef.current?.emit("call-ended");
    socketRef.current?.disconnect();
    setCallStatus("ended");
  }, [stopRecording]);

  const partner = participants.find((p) => p.userId !== userId);

  return {
    localStream,
    remoteStream,
    participants,
    partner,
    translations,
    isMuted,
    isVideoOff,
    voiceEnabled,
    callStatus,
    callError,
    isListening,
    toggleMute,
    toggleVideo,
    toggleVoice,
    endCall,
  };
}
