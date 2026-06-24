"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  Type,
  Volume2,
  Radio,
  ChevronDown,
} from "lucide-react";
import { getLanguage } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { playCallEndTone } from "@/lib/ringtone";
import { MicPermissionGate } from "@/components/MicPermissionGate";
import { AppSplash } from "@/components/AppSplash";
import { TcallLogo } from "@/components/TcallLogo";
import { useAuth } from "@/hooks/useAuth";
import { useCallContext } from "@/components/providers/CallProvider";
import { useActiveCallOptional } from "@/components/active-call/ActiveCallStateContext";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const LEAVE_DELAY_MS = 500;
const ERROR_LEAVE_DELAY_MS = 2200;

export function AudioCallRoom() {
  const router = useRouter();
  const { user } = useAuth();
  const { minimizeCall, activeCall } = useCallContext();
  const call = useActiveCallOptional();
  const leaveHandledRef = useRef(false);

  const leaveToDashboard = useCallback(() => {
    if (!activeCall || leaveHandledRef.current) return;
    leaveHandledRef.current = true;
    playCallEndTone();
    router.replace("/dashboard");
  }, [activeCall, router]);

  const handleTap = useCallback(() => {
    void call?.unlockAudio();
    void call?.playRemoteAudio();
  }, [call]);

  useEffect(() => {
    if (!call || call.callStatus !== "ended") return;
    const timer = setTimeout(leaveToDashboard, LEAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [call, call?.callStatus, leaveToDashboard]);

  useEffect(() => {
    if (!call || call.callStatus !== "error" || call.micStatus !== "granted") return;
    const timer = setTimeout(() => {
      call.endCall();
      leaveToDashboard();
    }, ERROR_LEAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [call, leaveToDashboard]);

  if (!user || !activeCall || !call) return null;

  const ui = useUI(user.language);
  const partnerLang = call.partner ? getLanguage(call.partner.language) : null;

  if (call.micStatus !== "granted" && call.callStatus !== "ended") {
    return (
      <MicPermissionGate
        ui={ui}
        status={call.micStatus}
        onAllow={() => void call.requestMicrophone()}
      />
    );
  }

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
          <TcallLogo size="md" animate className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{err.t}</h2>
          <p className="text-slate-500 mb-6 text-sm">{err.d}</p>
          <p className="text-sm text-slate-400">{ui.returningToDashboard}</p>
        </div>
      </div>
    );
  }

  if (call.callStatus === "ended") {
    return <AppSplash message={ui.returningToDashboard} />;
  }

  return (
    <div className="phone-screen" onClick={handleTap}>
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

      {latestTranslation && (
        <div className={`phone-subtitle ${call.translationMode === "voice" ? "phone-subtitle-voice" : ""}`}>
          <p className="text-slate-400 text-[10px] mb-1">{latestTranslation.speaker} · {ui.translated}</p>
          <p className="text-slate-900 font-medium">{latestTranslation.translated}</p>
          {latestTranslation.original !== latestTranslation.translated && (
            <p className="text-slate-500 text-xs mt-1 italic">{latestTranslation.original}</p>
          )}
        </div>
      )}

      {latestOwn && call.translationMode === "text" && (
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
        <button onClick={() => call.endCall()} className="phone-control-btn phone-end-btn">
          <PhoneOff className="w-7 h-7" />
        </button>
        <button
          onClick={() => minimizeCall()}
          className="phone-control-btn glass"
          title={ui.minimizeCall}
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}
