"use client";

import { useEffect, useCallback } from "react";
import { useCall, type TranslationMode } from "@/hooks/useCall";
import { configureRemoteAudioElement } from "@/lib/audio-unlock";
import type { User } from "@/hooks/useAuth";
import { ActiveCallStateProvider } from "./ActiveCallStateContext";

interface ActiveCallEngineProps {
  roomId: string;
  isHost: boolean;
  user: User;
  onEnded: () => void;
  callMinimized: boolean;
  children: React.ReactNode;
}

function normalizeTranslationMode(value: string | undefined): TranslationMode {
  return value === "voice" ? "voice" : "text";
}

export function ActiveCallEngine({
  roomId,
  isHost,
  user,
  onEnded,
  callMinimized,
  children,
}: ActiveCallEngineProps) {
  const call = useCall({
    roomId,
    userId: user.userId,
    userName: user.name,
    userLanguage: user.language,
    translationMode: normalizeTranslationMode(user.translationMode),
    isHost,
    enabled: true,
  });

  const { micStatus, unlockAudio, playRemoteAudio, callStatus } = call;

  const setRemoteAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      call.remoteAudioRef.current = node;
      if (node) configureRemoteAudioElement(node);
    },
    [call.remoteAudioRef]
  );

  useEffect(() => {
    if (micStatus === "granted") {
      void unlockAudio();
      void playRemoteAudio();
    }
  }, [micStatus, unlockAudio, playRemoteAudio]);

  return (
    <ActiveCallStateProvider value={call}>
      <audio ref={setRemoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden />
      <CallEndedWatcher callStatus={callStatus} callMinimized={callMinimized} onEnded={onEnded} />
      {children}
    </ActiveCallStateProvider>
  );
}

function CallEndedWatcher({
  callStatus,
  callMinimized,
  onEnded,
}: {
  callStatus: string;
  callMinimized: boolean;
  onEnded: () => void;
}) {
  useEffect(() => {
    if (callStatus !== "ended") return;
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path.startsWith("/call/")) return;

    const delay = callMinimized ? 800 : 0;
    const timer = setTimeout(() => onEnded(), delay);
    return () => clearTimeout(timer);
  }, [callStatus, callMinimized, onEnded]);

  return null;
}
