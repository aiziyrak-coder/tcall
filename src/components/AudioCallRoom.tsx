"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  Type,
  Volume2,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { useCall, type TranslationMode } from "@/hooks/useCall";
import { getLanguage, getUI } from "@/lib/languages";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import type { User } from "@/hooks/useAuth";

interface AudioCallRoomProps {
  roomId: string;
  user: User;
  isHost: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function AudioCallRoom({ roomId, user, isHost }: AudioCallRoomProps) {
  const router = useRouter();
  const [showEndedModal, setShowEndedModal] = useState(false);

  const call = useCall({
    roomId,
    userId: user.userId,
    userName: user.name,
    userLanguage: user.language,
    translationMode: (user.translationMode as TranslationMode) || "text",
    isHost,
    enabled: true,
  });

  const ui = getUI(user.language);
  const userLang = getLanguage(user.language);
  const partnerLang = call.partner ? getLanguage(call.partner.language) : null;

  const handleTap = useCallback(() => {
    void call.unlockAudio();
    call.playRemoteAudio();
  }, [call]);

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

  const latestTranslation = call.translations.filter((t) => t.speaker !== user.name).slice(-1)[0];
  const latestOwn = call.translations.filter((t) => t.speaker === user.name).slice(-1)[0];

  const statusLabel =
    !call.socketConnected ? ui.socketOffline
    : call.callStatus === "active" ? formatDuration(call.callDuration)
    : call.callStatus === "ringing" ? ui.ringing
    : call.callStatus === "waiting" ? ui.waiting
    : call.callStatus === "ended" ? ui.ended
    : call.callStatus === "error" ? ui.roomError
    : ui.connecting;

  if (call.callStatus === "error") {
    const err =
      call.callError === "media_denied" ? { t: ui.mediaDenied, d: ui.micDeniedDesc }
      : call.callError === "room_full" ? { t: ui.roomFull, d: ui.roomFullDesc }
      : { t: ui.roomError, d: ui.callEndedDesc };
    return (
      <div className="phone-screen flex items-center justify-center p-5">
        <div className="glass rounded-2xl p-8 w-full max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{err.t}</h2>
          <p className="text-slate-500 mb-6 text-sm">{err.d}</p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">{ui.backToDashboard}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-screen" onClick={handleTap}>
      <audio ref={call.remoteAudioRef} autoPlay playsInline />

      <div className="phone-bg" />
      <div className={`phone-avatar-ring ${call.callStatus === "active" ? "phone-avatar-active" : ""}`}>
        <div className="phone-avatar">
          <span>{call.partner ? getInitials(call.partner.name) : "?"}</span>
        </div>
      </div>

      <div className="phone-info">
        <h1 className="text-2xl font-semibold text-slate-900">{call.partner?.name || ui.waiting}</h1>
        {call.partner && partnerLang && (
          <p className="text-slate-500 text-sm mt-1">{partnerLang.flag} {partnerLang.name}</p>
        )}
        <p className={`text-sm mt-3 ${call.callStatus === "active" ? "text-green-600 font-medium" : "text-slate-500"}`}>
          {statusLabel}
        </p>
      </div>

      {call.callStatus === "connecting" && call.partner && (
        <p className="relative z-10 text-xs text-brand-600 mt-2 px-6 text-center">
          Ovoz uchun ekranga bir marta bosing
        </p>
      )}

      {call.isListening && (
        <div className="phone-listening-badge">
          <Radio className="w-3 h-3 animate-pulse" /> {ui.aiActive}
        </div>
      )}

      {call.translationMode === "text" && latestTranslation && (
        <div className="phone-subtitle">
          <p className="text-slate-400 text-[10px] mb-1">{latestTranslation.speaker} · {ui.translated}</p>
          <p className="text-slate-900 font-medium">{latestTranslation.translated}</p>
          {latestTranslation.original !== latestTranslation.translated && (
            <p className="text-slate-500 text-xs mt-1 italic">{latestTranslation.original}</p>
          )}
        </div>
      )}

      {call.translationMode === "text" && latestOwn && (
        <div className="phone-subtitle-own">
          <p className="text-slate-500 text-xs">{ui.youSaid}: {latestOwn.original}</p>
        </div>
      )}

      {call.translationMode === "voice" && call.isSpeaking && (
        <div className="phone-voice-badge">
          <Volume2 className="w-4 h-4 animate-pulse" /> {ui.voiceSpeaking}
        </div>
      )}

      <div className="phone-mode-toggle">
        <button
          onClick={() => call.setTranslationMode("text")}
          className={`phone-mode-btn ${call.translationMode === "text" ? "phone-mode-active" : ""}`}
        >
          <Type className="w-4 h-4" /> {ui.textTranslation}
        </button>
        <button
          onClick={() => { handleTap(); call.setTranslationMode("voice"); }}
          className={`phone-mode-btn ${call.translationMode === "voice" ? "phone-mode-active" : ""}`}
        >
          <Volume2 className="w-4 h-4" /> {ui.voiceTranslation}
        </button>
      </div>

      <footer className="phone-controls">
        <button
          onClick={() => { handleTap(); call.toggleMute(); }}
          className={`phone-control-btn ${call.isMuted ? "bg-red-500" : "glass"}`}
        >
          {call.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button onClick={() => { call.endCall(); setShowEndedModal(true); }} className="phone-control-btn phone-end-btn">
          <PhoneOff className="w-7 h-7" />
        </button>
        <div className="phone-control-btn glass opacity-50 pointer-events-none">
          <span className="text-xs font-mono">{userLang.flag}</span>
        </div>
      </footer>

      {showEndedModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4 safe-bottom">
          <div className="glass rounded-t-3xl sm:rounded-2xl p-8 w-full max-w-sm text-center">
            <PhoneOff className="w-11 h-11 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2 text-slate-900">{ui.callEnded}</h2>
            <p className="text-slate-500 text-sm mb-6">{ui.callEndedDesc}</p>
            <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">{ui.backToDashboard}</button>
          </div>
        </div>
      )}
    </div>
  );
}
