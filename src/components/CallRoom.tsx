"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Globe,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Share2,
  Radio,
} from "lucide-react";
import { useCall } from "@/hooks/useCall";
import { getLanguage, getUI } from "@/lib/languages";
import { apiFetch } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
import { isMobileDevice } from "@/lib/mobile";
import type { User } from "@/hooks/useAuth";

interface CallRoomProps {
  roomId: string;
  user: User;
  isHost: boolean;
}

export function CallRoom({ roomId, user, isHost }: CallRoomProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showEndedModal, setShowEndedModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const call = useCall({
    roomId,
    userId: user.userId,
    userName: user.name,
    userLanguage: user.language,
    isHost,
    enabled: true,
  });

  const ui = getUI(user.language);
  const userLang = getLanguage(user.language);
  const partnerLang = call.partner ? getLanguage(call.partner.language) : null;

  useEffect(() => setIsMobile(isMobileDevice()), []);

  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [call.remoteStream]);

  useEffect(() => {
    if (call.callStatus === "ended") {
      apiFetch("/api/calls/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }).catch(() => {});
      setShowEndedModal(true);
    }
  }, [call.callStatus, roomId]);

  const handleShare = useCallback(async () => {
    void call.unlockAudio();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tcall", text: ui.shareLink, url });
        return;
      } catch { /* fallback */ }
    }
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ui.shareLink, call]);

  const handleControlTap = useCallback(() => {
    void call.unlockAudio();
  }, [call]);

  const statusLabel = !call.socketConnected
    ? ui.socketOffline
    : call.callStatus === "active"
      ? ui.connected
      : call.callStatus === "waiting"
        ? ui.waiting
        : call.callStatus === "ended"
          ? ui.ended
          : call.callStatus === "error"
            ? ui.roomError
            : call.partner
              ? ui.videoConnecting
              : ui.connecting;

  const statusColor = !call.socketConnected
    ? "bg-red-500/25 text-red-300"
    : call.callStatus === "active"
      ? "bg-green-500/25 text-green-300"
      : call.callStatus === "waiting"
        ? "bg-yellow-500/25 text-yellow-300"
        : "bg-white/15 text-white/70";

  if (call.callStatus === "error") {
    const err =
      call.callError === "media_denied" ? { t: ui.mediaDenied, d: ui.mediaDeniedDesc }
      : call.callError === "room_full" ? { t: ui.roomFull, d: ui.roomFullDesc }
      : { t: ui.roomError, d: ui.callEndedDesc };
    return (
      <div className="page-shell flex items-center justify-center p-5">
        <div className="glass rounded-2xl p-8 w-full max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{err.t}</h2>
          <p className="text-white/50 mb-6 text-sm">{err.d}</p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">{ui.backToDashboard}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-screen bg-black" onClick={handleControlTap}>
      <div className="absolute inset-0 max-md:inset-0 md:inset-x-6 md:top-16 md:bottom-24 md:flex md:gap-4">
        <div className="call-video-main max-md:absolute max-md:inset-0 md:relative md:flex-1 md:rounded-2xl">
          {call.remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Globe className="w-9 h-9 text-white/30" />
              </div>
              <p className="text-white/60">{call.partner ? ui.videoConnecting : ui.waiting}</p>
              {call.callStatus === "waiting" && (
                <button onClick={handleShare} className="btn-primary mt-5 w-full max-w-xs flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5" /> {ui.shareLink}
                </button>
              )}
            </div>
          )}
          {call.partner && (
            <div className="absolute top-3 left-3 glass rounded-full px-3 py-1 text-xs flex gap-2 z-10">
              <span>{call.partner.name}</span>
              {partnerLang && <span className="text-white/50">{partnerLang.flag} {partnerLang.name}</span>}
            </div>
          )}
        </div>

        <div className="call-pip">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {call.isVideoOff && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white/30" />
            </div>
          )}
          {call.isMuted && (
            <div className="absolute bottom-1 right-1 bg-red-500 rounded-full p-1">
              <MicOff className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      <header className="call-header">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-brand-300 font-bold truncate">{roomId}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {call.isListening && (
            <span className="text-[10px] text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> {ui.aiActive}
            </span>
          )}
          {call.isSpeaking && (
            <span className="text-[10px] text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 voice-pulse">
              <Volume2 className="w-3 h-3" /> {ui.voiceSpeaking}
            </span>
          )}
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center touch-manipulation" aria-label={ui.copyLink}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {call.isSpeaking && isMobile && (
        <div className="voice-indicator pointer-events-none">
          <Volume2 className="w-5 h-5" />
          <span>{ui.voiceSpeaking}</span>
        </div>
      )}

      <footer className="call-controls">
        <div className="flex justify-center gap-5 pt-3 px-4">
          <button onClick={() => { handleControlTap(); call.toggleMute(); }} className={`call-control-btn ${call.isMuted ? "bg-red-500" : "glass"}`} aria-label={ui.mute}>
            {call.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={() => { handleControlTap(); call.toggleVoice(); }} className={`call-control-btn ${!call.voiceEnabled ? "bg-yellow-600" : "glass"}`} aria-label={ui.voiceOff}>
            {call.voiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
          <button onClick={() => { call.endCall(); setShowEndedModal(true); }} className="call-control-btn call-control-btn-end bg-red-600 shadow-lg shadow-red-600/40" aria-label={ui.endCall}>
            <PhoneOff className="w-7 h-7" />
          </button>
          <button onClick={() => { handleControlTap(); call.toggleVideo(); }} className={`call-control-btn ${call.isVideoOff ? "bg-red-500" : "glass"}`} aria-label={ui.videoOff}>
            {call.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
      </footer>

      {showEndedModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center p-4 safe-bottom">
          <div className="glass rounded-t-3xl sm:rounded-2xl p-8 w-full max-w-sm text-center">
            <PhoneOff className="w-11 h-11 text-white/40 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">{ui.callEnded}</h2>
            <p className="text-white/50 text-sm mb-6">{ui.callEndedDesc}</p>
            <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">{ui.backToDashboard}</button>
          </div>
        </div>
      )}
    </div>
  );
}
