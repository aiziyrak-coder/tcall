"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessageBubbleProps {
  src: string;
  isMine: boolean;
  duration?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessageBubble({ src, isMine, duration }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [loaded, setLoaded] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
        setLoaded(true);
      }
    });
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setCurrentTime(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    });
    audio.load();

    return () => {
      audio.pause();
      audio.src = "";
      audio.remove();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [src]);

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
      audio.play().catch(() => {});
      setPlaying(true);
      animRef.current = requestAnimationFrame(tick);
    } else {
      audio.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const t = (Number(e.target.value) / 100) * totalDuration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayTime = playing ? formatTime(currentTime) : formatTime(totalDuration);

  return (
    <div className={`voice-bubble ${isMine ? "voice-bubble-mine" : "voice-bubble-theirs"}`}>
      <button
        type="button"
        className="voice-play-btn"
        onClick={togglePlay}
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
      >
        {playing
          ? <Pause className="w-5 h-5" />
          : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      <div className="voice-progress-wrap">
        <div className="voice-waveform">
          {Array.from({ length: 28 }, (_, i) => {
            const filled = progress / 100 > i / 28;
            const h = [35, 55, 70, 45, 80, 50, 65, 40, 90, 60, 75, 45, 55, 85, 50, 70, 40, 65, 80, 55, 45, 70, 60, 50, 75, 40, 65, 55][i] ?? 50;
            return (
              <span
                key={i}
                className={`voice-bar ${filled ? "voice-bar-filled" : ""}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="voice-seek"
          aria-label="Pozitsiya"
        />
      </div>

      <span className="voice-time">{displayTime}</span>
    </div>
  );
}
