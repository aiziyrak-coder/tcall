"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  Type,
  Volume2,
  Radio,
  ChevronDown,
  Languages,
  Loader2,
} from "lucide-react";
import { getLanguage } from "@/lib/languages";
import { normalizeLanguageCode } from "@/lib/lang-validators";
import { useUI } from "@/components/providers/LocaleProvider";
import { playCallEndTone } from "@/lib/ringtone";
import { MicPermissionGate } from "@/components/MicPermissionGate";
import { AppSplash } from "@/components/AppSplash";
import { TcallLogo } from "@/components/TcallLogo";
import { useAuth } from "@/hooks/useAuth";
import { useCallContext } from "@/components/providers/CallProvider";
import { useActiveCallOptional } from "@/components/active-call/ActiveCallStateContext";
import { CallRatingModal } from "@/components/CallRatingModal";

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
  const { minimizeCall, activeCall, clearActiveCall } = useCallContext();
  const call = useActiveCallOptional();
  const leaveHandledRef = useRef(false);
  const pttHeldRef = useRef(false);
  const [showRating, setShowRating] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const ratingCallIdRef = useRef<string | null>(null);

  const leaveToDashboard = useCallback(() => {
    if (!activeCall || leaveHandledRef.current) return;
    leaveHandledRef.current = true;
    playCallEndTone();
    clearActiveCall();
    try {
      router.replace("/dashboard");
    } catch {
      window.location.href = "/dashboard";
    }
  }, [activeCall, clearActiveCall, router]);

  const handleTap = useCallback(() => {
    void call?.unlockAudio();
    void call?.playRemoteAudio();
  }, [call]);

  const onPttStart = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (pttHeldRef.current || !call || call.isMuted || call.callStatus !== "active") return;
      pttHeldRef.current = true;
      setPttActive(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      handleTap();
      call.pressTranslateStart();
    },
    [call, handleTap]
  );

  const onPttEnd = useCallback(
    (e?: React.PointerEvent<HTMLButtonElement>) => {
      if (e) {
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          /* ignore */
        }
      }
      if (!pttHeldRef.current) return;
      pttHeldRef.current = false;
      setPttActive(false);
      call?.pressTranslateEnd();
    },
    [call]
  );

  useEffect(() => {
    if (!call || call.callStatus !== "ended") return;

    if (call.callDuration >= 10 && activeCall?.roomId) {
      ratingCallIdRef.current = activeCall.roomId;
      const timer = setTimeout(() => setShowRating(true), 300);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(leaveToDashboard, LEAVE_DELAY_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.callStatus]);

  useEffect(() => {
    if (!call || call.callStatus !== "error") return;
    const timer = setTimeout(() => {
      call.endCall();
      leaveToDashboard();
    }, ERROR_LEAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [call, leaveToDashboard]);

  useEffect(() => {
    if (!call?.translationError) return;
    const delay =
      call.translationError === "rate_limit" || call.translationError === "error" ? 6000 : 3500;
    const timer = setTimeout(() => call.clearTranslationError(), delay);
    return () => clearTimeout(timer);
  }, [call?.translationError, call]);

  if (!user || !activeCall || !call) return null;

  const ui = useUI(user.language);

  if (showRating && ratingCallIdRef.current) {
    return (
      <CallRatingModal
        callId={ratingCallIdRef.current}
        userLanguage={user.language}
        onClose={() => {
          setShowRating(false);
          leaveToDashboard();
        }}
      />
    );
  }

  const partnerLang = call.partner ? getLanguage(call.partner.language) : null;
  const sameLanguage =
    !!call.partner &&
    normalizeLanguageCode(call.partner.language) === normalizeLanguageCode(user.language);
  const translationEnabled = !!call.partner && !sameLanguage && call.callStatus === "active";

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

  const activityLabel =
    call.translationActivity === "processing"
      ? ui.interpreterProcessing
      : call.translationActivity === "speaking"
        ? ui.interpreterSpeaking
        : call.translationActivity === "listening"
          ? ui.interpreterListening
          : null;

  const errorLabel =
    call.translationError === "no_speech"
      ? ui.interpreterNoSpeech
      : call.translationError === "rate_limit"
        ? ui.interpreterRateLimit
        : call.translationError === "same_lang"
          ? ui.interpreterSameLang
          : call.translationError
            ? ui.interpreterError
            : null;

  const statusLabel =
    !call.socketConnected ? ui.reconnecting
    : call.connectionSlow && (call.callStatus === "connecting" || call.callStatus === "waiting" || call.callStatus === "ringing")
      ? ui.connectingSlow
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
    <div className="phone-screen">
      <div className="phone-bg" />
      <div className="phone-content" onClick={handleTap}>
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
          <p className="text-xs text-brand-600 mt-2 px-6 text-center">{ui.tapForAudio}</p>
        )}

        {translationEnabled && call.isListening && !pttActive && (
          <div className="phone-listening-badge">
            <Radio className="w-3 h-3 animate-pulse" /> {ui.aiActive}
          </div>
        )}

        {call.isMuted && translationEnabled && (
          <p className="text-xs text-amber-700 bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2 mx-6 mt-2 text-center">
            {ui.unmuteToTranslate}
          </p>
        )}

        {sameLanguage && call.callStatus === "active" && (
          <p className="text-xs text-amber-700 bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2 mx-6 mt-2 text-center">
            {ui.translationSameLanguage}
          </p>
        )}

        {errorLabel && (
          <p
            className="phone-translate-error"
            onClick={(e) => {
              e.stopPropagation();
              call.clearTranslationError();
            }}
          >
            {errorLabel}
          </p>
        )}

        {activityLabel && translationEnabled && (
          <p className="phone-translate-status">
            {call.translationActivity === "processing" && (
              <Loader2 className="inline w-3.5 h-3.5 mr-1 animate-spin -mt-0.5" />
            )}
            {activityLabel}
          </p>
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

        {latestOwn && (
          <div className="phone-subtitle-own">
            <p className="text-slate-500 text-xs">{ui.youSaid}: {latestOwn.original}</p>
            {latestOwn.translated !== latestOwn.original && (
              <p className="text-brand-700 text-xs mt-0.5 font-medium">→ {latestOwn.translated}</p>
            )}
          </div>
        )}

        {call.translationMode === "voice" && call.isSpeaking && (
          <div className="phone-voice-badge">
            <Volume2 className="w-4 h-4 animate-pulse" /> {ui.voiceSpeaking}
          </div>
        )}

        {translationEnabled && (
          <button
            type="button"
            className={`phone-translate-ptt ${pttActive ? "phone-translate-ptt-active" : ""}`}
            disabled={call.isMuted}
            onPointerDown={onPttStart}
            onPointerUp={onPttEnd}
            onPointerLeave={onPttEnd}
            onPointerCancel={onPttEnd}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            <Languages className={`w-5 h-5 ${pttActive ? "animate-pulse" : ""}`} />
            <span>{ui.interpreterHoldToTalk}</span>
            <span className="text-[10px] font-normal opacity-80">{ui.interpreterReleaseHint}</span>
          </button>
        )}

        {translationEnabled && (
          <div className="phone-mode-toggle" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => call.setTranslationMode("text")}
              className={`phone-mode-btn ${call.translationMode === "text" ? "phone-mode-active" : ""}`}
            >
              <Type className="w-4 h-4" /> {ui.textTranslation}
            </button>
            <button
              type="button"
              onClick={() => {
                handleTap();
                call.setTranslationMode("voice");
              }}
              className={`phone-mode-btn ${call.translationMode === "voice" ? "phone-mode-active" : ""}`}
            >
              <Volume2 className="w-4 h-4" /> {ui.voiceTranslation}
            </button>
          </div>
        )}
      </div>

      <footer className="phone-controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => {
            handleTap();
            call.toggleMute();
          }}
          className={`phone-control-btn ${call.isMuted ? "bg-red-500" : "glass"}`}
        >
          {call.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button type="button" onClick={() => call.endCall()} className="phone-control-btn phone-end-btn">
          <PhoneOff className="w-7 h-7" />
        </button>
        <button
          type="button"
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
