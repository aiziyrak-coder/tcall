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
import { useRouter, usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/api";
import { startRingtone, stopRingtone, unlockAudio, playCallEndTone } from "@/lib/ringtone";
import {
  requestNotificationPermission,
  showIncomingCallNotification,
} from "@/lib/notifications";
import { formatTcallId } from "@/lib/tcallId";
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
}

interface CallContextValue {
  incomingCall: IncomingCall | null;
  outgoingCall: OutgoingCall | null;
  dial: (tcallId: string) => Promise<void>;
  cancelOutgoing: () => void;
  notificationsEnabled: boolean;
  enableNotifications: () => Promise<boolean>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

interface CallProviderProps {
  userId?: string;
  userLanguage?: string;
  translationMode?: string;
  children: ReactNode;
}

export function CallProvider({
  userId,
  userLanguage = "uz",
  translationMode = "text",
  children,
}: CallProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    const ok = await requestNotificationPermission();
    setNotificationsEnabled(ok);
    await unlockAudio();
    return ok;
  }, []);

  useEffect(() => {
    if (!userId) return;

    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register-user", { userId, translationMode });
    });

    socket.on("incoming-call", (data: IncomingCall) => {
      setIncomingCall(data);
      startRingtone();
      showIncomingCallNotification(data.caller.name, formatTcallId(data.caller.tcallId));
    });

    socket.on("call-accepted", ({ roomId }: { roomId: string }) => {
      stopRingtone();
      setOutgoingCall(null);
      router.push(`/call/${roomId}`);
    });

    socket.on("call-rejected", () => {
      stopRingtone();
      playCallEndTone();
      setOutgoingCall(null);
    });

    socket.on("call-cancelled", ({ roomId }: { roomId: string }) => {
      stopRingtone();
      setIncomingCall((prev) => (prev?.roomId === roomId ? null : prev));
    });

    return () => {
      stopRingtone();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, translationMode, router]);

  useEffect(() => {
    if (incomingCall) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    stopRingtone();
    playCallEndTone();
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-reject", {
        roomId: incomingCall.roomId,
        callerId: incomingCall.caller.userId,
      });
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const acceptCall = useCallback(() => {
    stopRingtone();
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-accept", {
        roomId: incomingCall.roomId,
        callerId: incomingCall.caller.userId,
      });
      const roomId = incomingCall.roomId;
      setIncomingCall(null);
      router.push(`/call/${roomId}`);
    }
  }, [incomingCall, router]);

  const cancelOutgoing = useCallback(() => {
    stopRingtone();
    playCallEndTone();
    if (outgoingCall && socketRef.current) {
      socketRef.current.emit("call-cancel", {
        roomId: outgoingCall.roomId,
        calleeId: outgoingCall.callee.userId,
      });
    }
    setOutgoingCall(null);
  }, [outgoingCall]);

  const dial = useCallback(
    async (tcallId: string) => {
      await unlockAudio();
      const { apiFetch } = await import("@/lib/api");
      const res = await apiFetch("/api/calls/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcallId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");

      setOutgoingCall({
        roomId: data.roomId,
        callId: data.callId,
        callee: data.callee,
      });
    },
    []
  );

  const isOnCallPage = pathname?.startsWith("/call/");

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        outgoingCall,
        dial,
        cancelOutgoing,
        notificationsEnabled,
        enableNotifications,
      }}
    >
      {children}

      {incomingCall && !isOnCallPage && (
        <IncomingCallModal
          call={incomingCall}
          userLanguage={userLanguage}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {outgoingCall && !isOnCallPage && (
        <OutgoingCallModal
          call={outgoingCall}
          userLanguage={userLanguage}
          onCancel={cancelOutgoing}
        />
      )}
    </CallContext.Provider>
  );
}
