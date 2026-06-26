"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Play, Pause, Volume2 } from "lucide-react";

export interface ChatViewerItem {
  src: string;
  type: "image" | "video";
  name?: string;
}

interface ChatMediaViewerProps {
  items: ChatViewerItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export function ChatMediaViewer({ items, index, onClose, onIndexChange }: ChatMediaViewerProps) {
  const [current, setCurrent] = useState(index);
  const [scale, setScale] = useState(1);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);
  const swipeStartX = useRef(0);

  const item = items[current] ?? items[0];
  const hasPrev = current > 0;
  const hasNext = current < items.length - 1;

  useEffect(() => {
    setCurrent(index);
  }, [index]);

  useEffect(() => {
    setScale(1);
    setVideoPlaying(false);
    setVideoReady(false);
  }, [current, item?.src]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    const next = current - 1;
    setCurrent(next);
    onIndexChange?.(next);
  }, [current, hasPrev, onIndexChange]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    const next = current + 1;
    setCurrent(next);
    onIndexChange?.(next);
  }, [current, hasNext, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDownload = () => {
    if (!item) return;
    const a = document.createElement("a");
    a.href = item.src;
    a.download = item.name || "file";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) return;
    swipeStartX.current = e.clientX;
    setDragStart({ x: e.clientY, y: e.clientY });
    setDragDelta({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || scale > 1) return;
    const dy = e.clientY - dragStart.x;
    const dx = e.clientX - swipeStartX.current;
    setDragDelta({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (dragDelta.y > 90) { close(); return; }
    if (Math.abs(dragDelta.x) > 70) {
      if (dragDelta.x < 0) goNext();
      else goPrev();
    }
    setDragStart(null);
    setDragDelta({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale((s) => (s > 1 ? 1 : 2.2));
    }
    lastTapRef.current = now;
  };

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setVideoPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setVideoPlaying(false);
    }
  };

  if (!item) return null;

  const overlayStyle = {
    transform: dragDelta.x || dragDelta.y
      ? `translate(${dragDelta.x * 0.35}px, ${dragDelta.y}px)`
      : undefined,
    opacity: dragDelta.y ? Math.max(0.35, 1 - Math.abs(dragDelta.y) / 220) : undefined,
    transition: dragStart ? "none" : "transform 0.22s ease, opacity 0.22s ease",
  };

  return (
    <div
      className={`chat-viewer-overlay ${closing ? "chat-viewer-closing" : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="chat-viewer-header">
        <span className="chat-viewer-title truncate">
          {item.name || (item.type === "image" ? "Rasm" : "Video")}
          {items.length > 1 && <span className="chat-viewer-counter"> {current + 1}/{items.length}</span>}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="chat-viewer-btn" onClick={handleDownload} title="Yuklab olish">
            <Download className="w-5 h-5" />
          </button>
          <button type="button" className="chat-viewer-close" onClick={close} aria-label="Yopish">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div
        className="chat-viewer-body"
        style={overlayStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {hasPrev && (
          <button type="button" className="chat-viewer-nav chat-viewer-nav-prev" onClick={goPrev} aria-label="Oldingi">
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}
        {hasNext && (
          <button type="button" className="chat-viewer-nav chat-viewer-nav-next" onClick={goNext} aria-label="Keyingi">
            <ChevronRight className="w-7 h-7" />
          </button>
        )}

        {item.type === "image" && (
          <img
            src={item.src}
            alt={item.name || "rasm"}
            className="chat-viewer-image"
            style={{
              transform: `scale(${scale})`,
              transition: scale === 1 ? "transform 0.2s ease" : "none",
            }}
            onClick={handleDoubleTap}
            draggable={false}
          />
        )}

        {item.type === "video" && (
          <div className="chat-viewer-video-wrap">
            <video
              ref={videoRef}
              key={item.src}
              src={item.src}
              className="chat-viewer-video"
              playsInline
              preload="metadata"
              onLoadedData={() => setVideoReady(true)}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => setVideoPlaying(false)}
              onClick={toggleVideo}
            />
            {!videoPlaying && (
              <button type="button" className="chat-viewer-video-play" onClick={toggleVideo} aria-label="Ijro etish">
                <Play className="w-10 h-10 ml-1" />
              </button>
            )}
            {videoPlaying && (
              <button type="button" className="chat-viewer-video-pause-hit" onClick={toggleVideo} aria-label="To'xtatish" />
            )}
            {!videoReady && (
              <div className="chat-viewer-video-loading">
                <Volume2 className="w-8 h-8 opacity-70" />
              </div>
            )}
          </div>
        )}
      </div>

      {item.type === "image" && scale === 1 && (
        <p className="chat-viewer-hint">Ikki marta bosing — kattalashtirish · pastga suring — yopish</p>
      )}
      {item.type === "video" && (
        <p className="chat-viewer-hint">Bosing — ijro/to&apos;xtatish · chap/o&apos;ng — keyingi media</p>
      )}
    </div>
  );
}
