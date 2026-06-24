"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Languages,
  Mic,
  MicOff,
  Loader2,
  Radio,
  User,
  Users,
  Volume2,
  Search,
} from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { useLiveInterpreter, type InterpreterSpeaker } from "@/hooks/useLiveInterpreter";
import { unlockAudio, markUserGesture } from "@/lib/ringtone";

interface LiveInterpreterProps {
  userLanguage: string;
}

function VoiceWave({ active, color }: { active: boolean; color: string }) {
  return (
    <div className={`interpreter-voice-wave ${active ? "interpreter-voice-wave-active" : ""}`} aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className="interpreter-voice-bar"
          style={{
            animationDelay: `${i * 0.08}s`,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

function LangSelect({
  label,
  value,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="interpreter-lang-select">
      <label className="interpreter-lang-label">{label}</label>
      <div className="interpreter-lang-search-wrap">
        <Search className="w-3.5 h-3.5 interpreter-lang-search-icon" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="interpreter-lang-search"
        />
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="interpreter-select">
        {filtered.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PttButton({
  speaker,
  active,
  disabled,
  onPressStart,
  onPressEnd,
  className,
  children,
}: {
  speaker: InterpreterSpeaker;
  active: boolean;
  disabled: boolean;
  onPressStart: (s: InterpreterSpeaker) => void;
  onPressEnd: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const handleStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    markUserGesture();
    void unlockAudio();
    onPressStart(speaker);
  };

  const handleEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onPressEnd();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={`${className} ${active ? "interpreter-ptt-active" : ""}`}
    >
      {children}
    </button>
  );
}

export function LiveInterpreter({ userLanguage }: LiveInterpreterProps) {
  const ui = useUI(userLanguage);
  const [mySearch, setMySearch] = useState("");
  const [theirSearch, setTheirSearch] = useState("");

  const {
    myLang,
    theirLang,
    setMyLang,
    setTheirLang,
    sessionActive,
    recording,
    activity,
    activeTargetLang,
    error,
    setError,
    micDenied,
    startSession,
    stopSession,
    pressStart,
    pressEnd,
    swapLanguages,
  } = useLiveInterpreter(userLanguage);

  useEffect(() => {
    markUserGesture();
    void unlockAudio();
  }, []);

  const handleActivate = async () => {
    markUserGesture();
    await unlockAudio();
    await startSession();
  };

  const myLangInfo = getLanguage(myLang);
  const theirLangInfo = getLanguage(theirLang);
  const speakLangInfo = activeTargetLang ? getLanguage(activeTargetLang) : null;
  const sameLang = myLang === theirLang;
  const busy = activity === "processing";

  const errorText =
    error === "no_speech"
      ? ui.interpreterNoSpeech
      : error === "rate_limit"
        ? ui.interpreterRateLimit
        : error === "error"
          ? ui.interpreterError
          : error || "";

  const statusText =
    activity === "listening"
      ? ui.interpreterListening
      : activity === "processing"
        ? ui.interpreterProcessing
        : activity === "speaking"
          ? ui.interpreterSpeaking
          : sessionActive
            ? ui.interpreterSessionActive
            : ui.interpreterHint;

  const waveActive = activity === "listening" || activity === "speaking";
  const waveColor =
    activity === "speaking" ? "#7c3aed" : activity === "listening" ? "#ef4444" : "#10b981";

  return (
    <div className="interpreter-panel interpreter-panel-voice">
      <div className="interpreter-hero">
        <div className="interpreter-hero-icon">
          <Languages className="w-6 h-6" strokeWidth={2} />
        </div>
        <div>
          <h2 className="interpreter-title">{ui.interpreterTitle}</h2>
          <p className="interpreter-desc">{ui.interpreterDesc}</p>
        </div>
        {sessionActive && (
          <span className="interpreter-live-badge">
            <Radio className="w-3 h-3" />
            {ui.interpreterSessionActive}
          </span>
        )}
      </div>

      {sameLang && <div className="interpreter-warn">{ui.interpreterSameLang}</div>}

      <div className="interpreter-session-row">
        {sessionActive ? (
          <button type="button" onClick={stopSession} className="interpreter-session-btn interpreter-session-stop">
            <MicOff className="w-4 h-4" />
            {ui.interpreterStop}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleActivate()}
            className="interpreter-session-btn interpreter-session-start"
          >
            <Mic className="w-4 h-4" />
            {ui.interpreterStart}
          </button>
        )}
      </div>

      <div className="interpreter-ptt-grid">
        <PttButton
          speaker="me"
          active={recording === "me"}
          disabled={sameLang || busy}
          onPressStart={pressStart}
          onPressEnd={pressEnd}
          className="interpreter-ptt interpreter-ptt-me"
        >
          <div className="interpreter-ptt-icon">
            <User className="w-7 h-7" strokeWidth={2} />
          </div>
          <span className="interpreter-ptt-label">{ui.interpreterISpeak}</span>
          <span className="interpreter-ptt-hint">{ui.interpreterHoldToTalk}</span>
          <span className="interpreter-ptt-lang">
            {myLangInfo.flag} → {theirLangInfo.flag}
          </span>
        </PttButton>

        <PttButton
          speaker="them"
          active={recording === "them"}
          disabled={sameLang || busy}
          onPressStart={pressStart}
          onPressEnd={pressEnd}
          className="interpreter-ptt interpreter-ptt-them"
        >
          <div className="interpreter-ptt-icon">
            <Users className="w-7 h-7" strokeWidth={2} />
          </div>
          <span className="interpreter-ptt-label">{ui.interpreterTheySpeak}</span>
          <span className="interpreter-ptt-hint">{ui.interpreterHoldToTalk}</span>
          <span className="interpreter-ptt-lang">
            {theirLangInfo.flag} → {myLangInfo.flag}
          </span>
        </PttButton>
      </div>

      <p className="interpreter-footer-hint">{ui.interpreterReleaseHint}</p>

      <div className="interpreter-voice-arena">
        <VoiceWave active={waveActive} color={waveColor} />
        <div className="interpreter-voice-center">
          {activity === "processing" && <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />}
          {activity === "speaking" && speakLangInfo && (
            <span className="interpreter-speaking-flag">{speakLangInfo.flag}</span>
          )}
          {activity === "listening" && (
            <span className="interpreter-listening-icon">
              <Mic className="w-8 h-8" />
            </span>
          )}
          {activity === "idle" && sessionActive && <Volume2 className="w-8 h-8 text-emerald-500" />}
          {!sessionActive && activity === "idle" && <Languages className="w-8 h-8 text-slate-300" />}
        </div>
        <p className="interpreter-voice-status">{statusText}</p>
        {speakLangInfo && activity === "speaking" && (
          <p className="interpreter-voice-lang-name">
            {speakLangInfo.flag} {speakLangInfo.name}
          </p>
        )}
      </div>

      {micDenied && <div className="interpreter-error">{ui.interpreterMicRequired}</div>}
      {errorText && !micDenied && (
        <div className="interpreter-error interpreter-error-soft" onClick={() => setError("")}>
          {errorText}
        </div>
      )}

      <details className="interpreter-lang-details">
        <summary className="interpreter-lang-summary">
          {myLangInfo.flag} {myLangInfo.name} ↔ {theirLangInfo.flag} {theirLangInfo.name}
        </summary>
        <div className="interpreter-lang-bar interpreter-lang-bar-stacked">
          <LangSelect
            label={ui.interpreterMyLang}
            value={myLang}
            onChange={setMyLang}
            search={mySearch}
            onSearchChange={setMySearch}
            searchPlaceholder={ui.search}
          />
          <button
            type="button"
            onClick={swapLanguages}
            className="interpreter-swap-btn interpreter-swap-btn-center"
            title={ui.interpreterSwapLang}
            aria-label={ui.interpreterSwapLang}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <LangSelect
            label={ui.interpreterTheirLang}
            value={theirLang}
            onChange={setTheirLang}
            search={theirSearch}
            onSearchChange={setTheirSearch}
            searchPlaceholder={ui.search}
          />
        </div>
      </details>
    </div>
  );
}
