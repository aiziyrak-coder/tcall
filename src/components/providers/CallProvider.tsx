"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { apiFetch, getSocketUrl } from "@/lib/api";
import {
  startRingtone,
  stopRingtone,
  startRingback,
  stopRingback,
  unlockAudio,
  playCallEndTone,
  setupAudioUnlockOnGesture,
} from "@/lib/ringtone";
import {
  requestNotificationPermission,
  showIncomingCallNotification,
} from "@/lib/notifications";
import { formatTcallId } from "@/lib/tcallId";
import { RING_TIMEOUT_MS } from "@/lib/call-service";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { OutgoingCallModal } from "@/components/OutgoingCallModal";

export interface IncomingCall {
  roomId: string;
  callId: string;
  caller: {
    userId: string;
    name: string;
    language: string;
    tcallId: string;
  };
}

export interface OutgoingCall {
  roomId: string;
  callId: string;
  callee: { userId: string; name: string; tcallId: string; language: string };
  calleeOnline?: boolean;
}

export class DialError extends Error {
  canMessage?: boolean;
  calleeTcallId?: string;
  calleeName?: string;
  constructor(message: string, opts?: { canMessage?: boolean; calleeTcallId?: string; calleeName?: string }) {
    super(message);
    this.canMessage = opts?.canMessage;
    this.calleeTcallId = opts?.calleeTcallId;
    this.calleeName = opts?.calleeName;
  }
}

interface CallContextValue {
  incomingCall: IncomingCall | null;
  outgoingCall: OutgoingCall | null;
  dial: (tcallId: string) => Promise<void>;
  cancelOutgoing: () => void;
  notificationsEnabled: boolean;
  enableNotifications: () => Promise<boolean>;
  quickMessageTarget: { tcallId: string; name?: string } | null;
  clearQuickMessageTarget: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

interface CallProviderProps {
  userId: string;
  userLanguage: string;
  translationMode?: string;
  children: ReactNode;
}

export function CallProvider({
  userId,
  userLanguage,
  children,
}: CallProviderProps) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [quickMessageTarget, setQuickMessageTarget] = useState<{ tcallId: string; name?: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (dialError) {
      const t = setTimeout(() => setDialError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [dialError]);

  useEffect(() => {
    setupAudioUnlockOnGesture();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    await unlockAudio();
    const ok = await requestNotificationPermission();
    setNotificationsEnabled(ok);
    return ok;
  }, []);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      /* Auth via cookie — server auto-registers userId */
    });

    socket.on("incoming-call", (data: IncomingCall) => {
      setIncomingCall(data);
      showIncomingCallNotification(data.caller.name, formatTcallId(data.caller.tcallId));
    });

    socket.on("call-accepted", ({ roomId }: { roomId: string }) => {
      clearRingTimeout();
      stopRingback();
      setOutgoingCall(null);
      router.push(`/call/${roomId}`);
    });

    socket.on("call-rejected", () => {
      clearRingTimeout();
      stopRingback();
      playCallEndTone();
      setOutgoingCall(null);
    });

    socket.on("call-timeout", () => {
      clearRingTimeout();
      stopRingback();
      playCallEndTone();
      setOutgoingCall(null);
      setIncomingCall(null);
    });

    socket.on("call-cancelled", ({ roomId }: { roomId: string }) => {
      stopRingtone();
      setIncomingCall((prev) => (prev?.roomId === roomId ? null : prev));
    });

    socket.on("call-error", ({ message }: { message: string }) => {
      setDialError(message);
      stopRingtone();
    });

    socket.on("quick-message", () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tcall:quick-message"));
      }
    });

    socket.on("connect_error", () => {
      /* Auth failed — session expired */
    });

    return () => {
      clearRingTimeout();
      stopRingtone();
      stopRingback();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, router, clearRingTimeout]);

  useEffect(() => {
    if (incomingCall) startRingtone();
    else stopRingtone();
    return () => stopRingtone();
  }, [incomingCall]);

  useEffect(() => {
    if (outgoingCall) {
      startRingback();
      clearRingTimeout();
      ringTimeoutRef.current = setTimeout(() => {
        cancelOutgoingRef.current();
      }, RING_TIMEOUT_MS);
    } else {
      stopRingback();
      clearRingTimeout();
    }
    return () => {
      stopRingback();
      clearRingTimeout();
    };
  }, [outgoingCall, clearRingTimeout]);

  const cancelOutgoingRef = useRef<() => void>(() => {});

  const rejectCall = useCallback(async () => {
    await unlockAudio();
    stopRingtone();
    playCallEndTone();
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-reject", { roomId: incomingCall.roomId });
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    await unlockAudio();
    stopRingtone();
    const roomId = incomingCall.roomId;

    try {
      const res = await apiFetch("/api/calls/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");

      socketRef.current?.emit("call-accept", { roomId });
      setIncomingCall(null);
      router.push(`/call/${roomId}`);
    } catch {
      socketRef.current?.emit("call-reject", { roomId });
      setIncomingCall(null);
    }
  }, [incomingCall, router]);

  const cancelOutgoing = useCallback(() => {
    stopRingback();
    playCallEndTone();
    clearRingTimeout();
    if (outgoingCall && socketRef.current) {
      socketRef.current.emit("call-cancel", { roomId: outgoingCall.roomId });
    }
    setOutgoingCall(null);
  }, [outgoingCall, clearRingTimeout]);

  cancelOutgoingRef.current = cancelOutgoing;

  const dial = useCallback(async (tcallId: string) => {
    setDialError(null);
    await unlockAudio();
    const res = await apiFetch("/api/calls/dial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tcallId }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.canMessage && data.calleeTcallId) {
        setQuickMessageTarget({ tcallId: data.calleeTcallId, name: data.callee?.name });
      }
      throw new DialError(data.error || "Xatolik", {
        canMessage: data.canMessage,
        calleeTcallId: data.calleeTcallId,
      });
    }

    setOutgoingCall({
      roomId: data.roomId,
      callId: data.callId,
      callee: data.callee,
      calleeOnline: data.calleeOnline,
    });

    if (!data.delivered) {
      setDialError("Abonent offline — kuting yoki keyinroq qayta urining");
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        outgoingCall,
        dial,
        cancelOutgoing,
        notificationsEnabled,
        enableNotifications,
        quickMessageTarget,
        clearQuickMessageTarget: () => setQuickMessageTarget(null),
      }}
    >
      {children}

      {dialError && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 rounded-xl px-4 py-3 text-sm text-center">
          {dialError}
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          userLanguage={userLanguage}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {outgoingCall && (
        <OutgoingCallModal
          call={outgoingCall}
          userLanguage={userLanguage}
          onCancel={cancelOutgoing}
        />
      )}
    </CallContext.Provider>
  );
}
