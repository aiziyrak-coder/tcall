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
  children: React.ReactNode;
}

function normalizeTranslationMode(value: string | undefined): TranslationMode {
  return value === "voice" ? "voice" : "text";
}

export function ActiveCallEngine({ roomId, isHost, user, onEnded, children }: ActiveCallEngineProps) {
  const call = useCall({
    roomId,
    userId: user.userId,
    userName: user.name,
    userLanguage: user.language,
    translationMode: normalizeTranslationMode(user.translationMode),
    isHost,
    enabled: true,
  });

  const setRemoteAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      call.remoteAudioRef.current = node;
      if (node) configureRemoteAudioElement(node);
    },
    [call.remoteAudioRef]
  );

  useEffect(() => {
    if (call.micStatus === "granted") {
      void call.unlockAudio();
      void call.playRemoteAudio();
    }
  }, [call.micStatus, call]);

  return (
    <ActiveCallStateProvider value={call}>
      <audio ref={setRemoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden />
      <CallEndedWatcher callStatus={call.callStatus} onEnded={onEnded} />
      {children}
    </ActiveCallStateProvider>
  );
}

/** Faqat minimizatsiya qilinganda sessiyani yopish — to'liq ekranda AudioCallRoom boshqaradi */
function CallEndedWatcher({
  callStatus,
  onEnded,
}: {
  callStatus: string;
  onEnded: () => void;
}) {
  useEffect(() => {
    if (callStatus !== "ended") return;
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path.startsWith("/call/")) return;
    onEnded();
  }, [callStatus, onEnded]);
  return null;
}
