"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  Languages,
  Mic,
  MicOff,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  Radio,
  User,
  Users,
} from "lucide-react";
import { getUI, LANGUAGES, getLanguage } from "@/lib/languages";
import { useLiveInterpreter, type InterpreterSpeaker } from "@/hooks/useLiveInterpreter";
import { unlockAudio } from "@/lib/ringtone";

interface LiveInterpreterProps {
  userLanguage: string;
}

export function LiveInterpreter({ userLanguage }: LiveInterpreterProps) {
  const ui = getUI(userLanguage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    myLang,
    theirLang,
    setMyLang,
    setTheirLang,
    sessionActive,
    recording,
    processing,
    speaking,
    voiceEnabled,
    setVoiceEnabled,
    entries,
    error,
    setError,
    micDenied,
    startSession,
    stopSession,
    beginRecording,
    endRecording,
    swapLanguages,
    clearHistory,
  } = useLiveInterpreter(userLanguage);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, processing]);

  const handleActivate = async () => {
    await unlockAudio();
    await startSession();
  };

  const handlePointerDown = (speaker: InterpreterSpeaker) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    void beginRecording(speaker);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    endRecording();
  };

  const myLangInfo = getLanguage(myLang);
  const theirLangInfo = getLanguage(theirLang);
  const sameLang = myLang === theirLang;

  const errorText =
    error === "no_speech"
      ? ui.interpreterNoSpeech
      : error === "error"
        ? ui.interpreterError
        : error
          ? error
          : "";

  return (
    <div className="interpreter-panel">
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

      <div className="interpreter-lang-bar">
        <div className="interpreter-lang-select">
          <label className="interpreter-lang-label">{ui.interpreterMyLang}</label>
          <select
            value={myLang}
            onChange={(e) => setMyLang(e.target.value)}
            className="interpreter-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={swapLanguages}
          className="interpreter-swap-btn"
          title={ui.interpreterSwapLang}
          aria-label={ui.interpreterSwapLang}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        <div className="interpreter-lang-select">
          <label className="interpreter-lang-label">{ui.interpreterTheirLang}</label>
          <select
            value={theirLang}
            onChange={(e) => setTheirLang(e.target.value)}
            className="interpreter-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sameLang && (
        <div className="interpreter-warn">{ui.interpreterSameLang}</div>
      )}

      <div className="interpreter-toolbar">
        <button
          type="button"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`interpreter-tool-btn ${voiceEnabled ? "interpreter-tool-active" : ""}`}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{voiceEnabled ? ui.interpreterVoiceOn : ui.interpreterVoiceOff}</span>
        </button>

        {entries.length > 0 && (
          <button type="button" onClick={clearHistory} className="interpreter-tool-btn">
            <Trash2 className="w-4 h-4" />
            <span>{ui.interpreterClearHistory}</span>
          </button>
        )}

        {sessionActive ? (
          <button type="button" onClick={stopSession} className="interpreter-tool-btn interpreter-tool-stop">
            <MicOff className="w-4 h-4" />
            <span>{ui.interpreterStop}</span>
          </button>
        ) : (
          <button type="button" onClick={() => void handleActivate()} className="interpreter-tool-btn interpreter-tool-start">
            <Mic className="w-4 h-4" />
            <span>{ui.interpreterStart}</span>
          </button>
        )}
      </div>

      <div className="interpreter-status-row">
        {recording && (
          <span className="interpreter-status interpreter-status-rec">
            <span className="interpreter-pulse" />
            {ui.interpreterListening}
          </span>
        )}
        {processing && (
          <span className="interpreter-status interpreter-status-proc">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {ui.interpreterProcessing}
          </span>
        )}
        {speaking && (
          <span className="interpreter-status interpreter-status-speak">
            <Volume2 className="w-3.5 h-3.5" />
            {ui.interpreterSpeaking}
          </span>
        )}
      </div>

      {micDenied && (
        <div className="interpreter-error">{ui.interpreterMicRequired}</div>
      )}
      {errorText && !micDenied && (
        <div className="interpreter-error interpreter-error-soft" onClick={() => setError("")}>
          {errorText}
        </div>
      )}

      <div className="interpreter-history" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="interpreter-empty">
            <Languages className="w-10 h-10 text-slate-300 mb-3" strokeWidth={1.5} />
            <p>{ui.interpreterHint}</p>
            <div className="interpreter-empty-langs">
              <span>{myLangInfo.flag} {myLangInfo.name}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{theirLangInfo.flag} {theirLangInfo.name}</span>
            </div>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`interpreter-bubble ${entry.speaker === "me" ? "interpreter-bubble-me" : "interpreter-bubble-them"}`}
            >
              <div className="interpreter-bubble-head">
                {entry.speaker === "me" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Users className="w-3.5 h-3.5" />
                )}
                <span>
                  {entry.speaker === "me" ? ui.interpreterISpeak : ui.interpreterTheySpeak}
                </span>
                <span className="interpreter-bubble-lang">
                  {getLanguage(entry.sourceLang).flag} → {getLanguage(entry.targetLang).flag}
                </span>
              </div>
              <p className="interpreter-bubble-original">{entry.original}</p>
              {entry.translated !== entry.original && (
                <p className="interpreter-bubble-translated">{entry.translated}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="interpreter-ptt-grid">
        <button
          type="button"
          disabled={sameLang || processing}
          onPointerDown={handlePointerDown("me")}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`interpreter-ptt interpreter-ptt-me ${recording === "me" ? "interpreter-ptt-active" : ""}`}
        >
          <div className="interpreter-ptt-icon">
            <User className="w-7 h-7" strokeWidth={2} />
          </div>
          <span className="interpreter-ptt-label">{ui.interpreterISpeak}</span>
          <span className="interpreter-ptt-hint">{ui.interpreterHoldToTalk}</span>
          <span className="interpreter-ptt-lang">{myLangInfo.flag} → {theirLangInfo.flag}</span>
        </button>

        <button
          type="button"
          disabled={sameLang || processing}
          onPointerDown={handlePointerDown("them")}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`interpreter-ptt interpreter-ptt-them ${recording === "them" ? "interpreter-ptt-active" : ""}`}
        >
          <div className="interpreter-ptt-icon">
            <Users className="w-7 h-7" strokeWidth={2} />
          </div>
          <span className="interpreter-ptt-label">{ui.interpreterTheySpeak}</span>
          <span className="interpreter-ptt-hint">{ui.interpreterHoldToTalk}</span>
          <span className="interpreter-ptt-lang">{theirLangInfo.flag} → {myLangInfo.flag}</span>
        </button>
      </div>

      <p className="interpreter-footer-hint">{ui.interpreterReleaseHint}</p>
    </div>
  );
}
