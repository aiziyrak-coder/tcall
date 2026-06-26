"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { clearChatAudioPlayback, registerChatAudioPlayback } from "@/lib/chat-audio-player";

interface VoiceMessageBubbleProps {
  src: string;
  isMine: boolean;
  duration?: number;
}

const WAVE_HEIGHTS = [
  35, 55, 70, 45, 80, 50, 65, 40, 90, 60, 75, 45, 55, 85, 50, 70, 40, 65, 80, 55, 45, 70, 60, 50, 75, 40, 65, 55,
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessageBubble({ src, isMine, duration }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      clearChatAudioPlayback(audio);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    const onPause = () => {
      if (audio.currentTime === 0 || audio.ended) return;
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      clearChatAudioPlayback(audio);
      audio.src = "";
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackRate((r) => (r >= 2 ? 1 : r === 1 ? 1.5 : 2));
  };

  const tick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (!audio.paused) animRef.current = requestAnimationFrame(tick);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      registerChatAudioPlayback(audio, () => setPlaying(false));
      void audio.play().then(() => {
        setPlaying(true);
        animRef.current = requestAnimationFrame(tick);
      }).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
      clearChatAudioPlayback(audio);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  };

  const handleSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const t = ratio * totalDuration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayTime = playing || currentTime > 0 ? formatTime(currentTime) : formatTime(totalDuration);

  return (
    <div
      className={`voice-bubble ${isMine ? "voice-bubble-mine" : "voice-bubble-theirs"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="voice-play-btn"
        onClick={togglePlay}
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      <div className="voice-body">
        <div
          className="voice-waveform"
          role="slider"
          aria-label="Ovoz pozitsiyasi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          onPointerDown={handleSeek}
        >
          {WAVE_HEIGHTS.map((h, i) => {
            const filled = progress / 100 > i / WAVE_HEIGHTS.length;
            return (
              <span
                key={i}
                className={`voice-bar ${filled ? "voice-bar-filled" : ""} ${playing ? "voice-bar-live" : ""}`}
                style={{ height: `${h}%`, animationDelay: `${i * 35}ms` }}
              />
            );
          })}
        </div>
        <div className="voice-meta">
          <span className="voice-time">{displayTime}</span>
          <button type="button" className="voice-speed-btn" onClick={cycleSpeed} aria-label="Tezlik">
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
