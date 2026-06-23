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
  Copy,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCall } from "@/hooks/useCall";
import { getLanguage, getUI } from "@/lib/languages";
import { apiFetch } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
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

  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
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

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleEndCall = () => {
    call.endCall();
    setShowEndedModal(true);
  };

  const partnerSubtitle = call.translations
    .filter((t) => t.speaker !== user.name)
    .slice(-1)[0];

  const statusLabel =
    call.callStatus === "active"
      ? ui.connected
      : call.callStatus === "waiting"
        ? ui.waiting
        : call.callStatus === "ended"
          ? ui.ended
          : call.callStatus === "error"
            ? ui.roomError
            : ui.connecting;

  if (call.callStatus === "error") {
    const errorMsg =
      call.callError === "media_denied"
        ? { title: ui.mediaDenied, desc: ui.mediaDeniedDesc }
        : call.callError === "room_full"
          ? { title: ui.roomFull, desc: ui.roomFullDesc }
          : { title: ui.roomError, desc: ui.callEndedDesc };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{errorMsg.title}</h2>
          <p className="text-white/50 mb-6">{errorMsg.desc}</p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary">
            {ui.backToDashboard}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="font-mono text-brand-400 font-bold text-lg">{roomId}</span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full ${
              call.callStatus === "active"
                ? "bg-green-500/20 text-green-400"
                : call.callStatus === "waiting"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-white/10 text-white/50"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-sm py-2 px-3 flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? ui.copied : ui.copyLink}</span>
          </button>
          {call.isListening && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> OpenAI
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto h-full flex flex-col gap-4">
          <div className="flex-1 grid md:grid-cols-2 gap-4 min-h-0">
            <div className="video-container relative">
              {call.remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse-ring">
                    <Globe className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/40">{ui.waiting}</p>
                  {call.callStatus === "waiting" && (
                    <button
                      onClick={handleCopyLink}
                      className="mt-4 text-sm text-brand-400 hover:underline"
                    >
                      {ui.shareLink}
                    </button>
                  )}
                </div>
              )}
              {call.partner && (
                <div className="absolute top-3 left-3 glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                  <span>{call.partner.name}</span>
                  {partnerLang && (
                    <span className="text-white/50">
                      {partnerLang.flag} {partnerLang.name}
                    </span>
                  )}
                </div>
              )}
              <div className="subtitle-overlay">
                {partnerSubtitle && (
                  <div className="subtitle-bubble">
                    <p className="text-white/50 text-xs mb-0.5">
                      {partnerSubtitle.speaker} · {ui.translated}
                    </p>
                    <p className="text-white font-medium">{partnerSubtitle.translated}</p>
                    {partnerSubtitle.original !== partnerSubtitle.translated && (
                      <p className="text-white/40 text-xs mt-1 italic">{partnerSubtitle.original}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="video-container relative">
              <video ref={localVideoRef} autoPlay playsInline muted />
              {call.isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <VideoOff className="w-12 h-12 text-white/20" />
                </div>
              )}
              <div className="absolute top-3 left-3 glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <span>{user.name}</span>
                <span className="text-white/50">
                  {userLang.flag} {userLang.name}
                </span>
              </div>
              {call.isMuted && (
                <div className="absolute top-3 right-3 bg-red-500/80 rounded-full p-1.5">
                  <MicOff className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          {call.translations.length > 0 && (
            <div className="glass rounded-xl p-4 max-h-32 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium">{ui.translation}</span>
              </div>
              <div className="space-y-2">
                {call.translations.slice(-5).map((t) => (
                  <div key={t.id} className="text-sm">
                    <span className="text-brand-400 font-medium">{t.speaker}:</span>{" "}
                    <span>{t.translated}</span>
                    {t.original !== t.translated && (
                      <span className="text-white/30 ml-2 text-xs">({t.original})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-3">
          <button
            onClick={call.toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              call.isMuted ? "bg-red-500 hover:bg-red-400" : "glass hover:bg-white/10"
            }`}
            title={call.isMuted ? ui.unmute : ui.mute}
          >
            {call.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={call.toggleVoice}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !call.voiceEnabled ? "bg-yellow-600/80 hover:bg-yellow-500" : "glass hover:bg-white/10"
            }`}
            title={call.voiceEnabled ? ui.voiceOff : ui.voiceOn}
          >
            {call.voiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
            title={ui.endCall}
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button
            onClick={call.toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              call.isVideoOff ? "bg-red-500/80 hover:bg-red-400" : "glass hover:bg-white/10"
            }`}
            title={call.isVideoOff ? ui.videoOn : ui.videoOff}
          >
            {call.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
      </footer>

      {showEndedModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="glass rounded-2xl p-8 max-w-sm text-center">
            <PhoneOff className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{ui.callEnded}</h2>
            <p className="text-white/50 mb-6">{ui.callEndedDesc}</p>
            <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">
              {ui.backToDashboard}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
