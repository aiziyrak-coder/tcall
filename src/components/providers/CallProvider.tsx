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
import { apiFetch, getSocketUrl, parseApiJson } from "@/lib/api";
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
  closeNotifications,
} from "@/lib/notifications";
import { formatTcallId } from "@/lib/tcallId";
import { RING_TIMEOUT_MS } from "@/lib/call-service";
import { prefetchMicrophoneAccess } from "@/lib/mic-permission";
import {
  notifySocketConnect,
  setSharedCallSocket,
} from "@/lib/call-socket";
import { SOCKET_CLIENT_OPTIONS } from "@/lib/socket-client";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { OutgoingCallModal } from "@/components/OutgoingCallModal";
import { ActiveCallEngine } from "@/components/active-call/ActiveCallEngine";
import { MiniCallBar } from "@/components/active-call/MiniCallBar";
import { useUI } from "@/components/providers/LocaleProvider";
import type { User } from "@/hooks/useAuth";

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
  socketConnected: boolean;
  getSocket: () => Socket | null;
  userLanguage: string;
  userName: string;
  activeCall: { roomId: string; isHost: boolean } | null;
  callMinimized: boolean;
  activateCall: (roomId: string, isHost: boolean) => void;
  minimizeCall: () => void;
  expandCall: () => void;
  clearActiveCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

interface CallProviderProps {
  user: User;
  children: ReactNode;
}

export function CallProvider({ user, children }: CallProviderProps) {
  const router = useRouter();
  const ui = useUI(user.language);
  const userId = user.userId;
  const userLanguage = user.language;
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [quickMessageTarget, setQuickMessageTarget] = useState<{ tcallId: string; name?: string } | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeCall, setActiveCall] = useState<{ roomId: string; isHost: boolean } | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
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
    if (acceptError) {
      const t = setTimeout(() => setAcceptError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [acceptError]);

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
    let cancelled = false;
    let socket: Socket | null = null;

    const timer = setTimeout(() => {
      if (cancelled) return;

      socket = io(getSocketUrl(), {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 30000,
        withCredentials: true,
        autoConnect: true,
      });
      socketRef.current = socket;
      setSharedCallSocket(socket);

      socket.on("connect", () => {
        setSocketConnected(true);
        notifySocketConnect(true);
        socket?.emit("register-user", {});
      });

      socket.io.on("reconnect", () => {
        setSocketConnected(true);
        notifySocketConnect(true);
        socket?.emit("register-user", {});
      });

      socket.on("disconnect", () => {
        setSocketConnected(false);
        notifySocketConnect(false);
      });

      socket.on("connect_error", () => {
        setSocketConnected(false);
      });

      socket.on("incoming-call", (data: IncomingCall) => {
        setIncomingCall(data);
        showIncomingCallNotification(
          data.caller.name,
          formatTcallId(data.caller.tcallId),
          data.roomId
        );
        void unlockAudio();
      });

      socket.on("call-accepted", ({ roomId }: { roomId: string }) => {
        clearRingTimeout();
        stopRingback();
        setOutgoingCall(null);
        const rid = roomId.toUpperCase();
        const current =
          typeof window !== "undefined" ? window.location.pathname.toUpperCase() : "";
        if (!current.endsWith(`/CALL/${rid}`)) {
          router.push(`/call/${rid}`);
        }
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

      socket.on("chat-message", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:chat-message", { detail: data }));
          window.dispatchEvent(new CustomEvent("tcall:quick-message"));

          const detail = data as {
            conversationId?: string;
            message?: { sender?: { name?: string }; displayText?: string | null; originalText?: string | null };
          };
          if (
            document.visibilityState === "hidden" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            detail.message
          ) {
            const body =
              detail.message.displayText ||
              detail.message.originalText ||
              "Yangi xabar";
            try {
              new Notification(detail.message.sender?.name || "Tcall", {
                body,
                tag: detail.conversationId || "chat",
                icon: "/icons/icon-192.png",
              });
            } catch {
              // ignore
            }
          }
        }
      });

      socket.on("chat-read", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:chat-read", { detail: data }));
        }
      });

      socket.on("user-presence", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:chat-presence", { detail: data }));
        }
      });

      socket.on("chat-typing", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:chat-typing", { detail: data }));
        }
      });

      socket.on("chat-message-deleted", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:chat-message-deleted", { detail: data }));
        }
      });

      socket.on("friend-request", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:friend-request", { detail: data }));
        }
      });

      socket.on("friend-accepted", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:friend-accepted", { detail: data }));
        }
      });

      socket.on("friend-rejected", (data: unknown) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tcall:friend-rejected", { detail: data }));
        }
      });
    }, 150);

    const reconnectSocket = () => {
      const s = socketRef.current;
      if (s && !s.connected) {
        try {
          s.connect();
        } catch {
          /* ignore */
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") reconnectSocket();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", reconnectSocket);

    let networkListener: { remove: () => Promise<void> } | null = null;
    void import("@capacitor/network")
      .then(({ Network }) =>
        Network.addListener("networkStatusChange", (status) => {
          if (status.connected) reconnectSocket();
        })
      )
      .then((handle) => {
        if (!cancelled) networkListener = handle;
        else void handle.remove();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reconnectSocket);
      void networkListener?.remove();
      clearRingTimeout();
      stopRingtone();
      stopRingback();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
      setSharedCallSocket(null);
      notifySocketConnect(false);
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
    if (incomingCall) {
      closeNotifications(incomingCall.roomId);
      if (socketRef.current) {
        socketRef.current.emit("call-reject", { roomId: incomingCall.roomId });
      }
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const [accepting, setAccepting] = useState(false);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || accepting) return;
    setAccepting(true);
    await unlockAudio();
    await prefetchMicrophoneAccess();
    stopRingtone();
    const roomId = incomingCall.roomId;
    closeNotifications(roomId);

    try {
      const res = await apiFetch("/api/calls/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || ui.dialError);

      socketRef.current?.emit("call-accept", { roomId });
      setIncomingCall(null);
      router.push(`/call/${roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : ui.acceptCallFailed;
      setAcceptError(message);
      socketRef.current?.emit("call-reject", { roomId });
      setIncomingCall(null);
    } finally {
      setAccepting(false);
    }
  }, [incomingCall, accepting, router, ui]);

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

  const activateCall = useCallback((roomId: string, isHost: boolean) => {
    setActiveCall({ roomId: roomId.toUpperCase(), isHost });
    setCallMinimized(false);
  }, []);

  const minimizeCall = useCallback(() => {
    setCallMinimized(true);
    router.push("/dashboard");
  }, [router]);

  const expandCall = useCallback(() => {
    if (!activeCall) return;
    setCallMinimized(false);
    router.push(`/call/${activeCall.roomId}`);
  }, [activeCall, router]);

  const clearActiveCall = useCallback(() => {
    setActiveCall(null);
    setCallMinimized(false);
  }, []);

  useEffect(() => {
    if (activeCall && callMinimized) {
      document.body.classList.add("has-mini-call");
    } else {
      document.body.classList.remove("has-mini-call");
    }
    return () => document.body.classList.remove("has-mini-call");
  }, [activeCall, callMinimized]);

  useEffect(() => {
    if (activeCall?.roomId && outgoingCall?.roomId.toUpperCase() === activeCall.roomId) {
      clearRingTimeout();
      stopRingback();
      setOutgoingCall(null);
    }
  }, [activeCall, outgoingCall, clearRingTimeout]);

  const dial = useCallback(async (tcallId: string) => {
    setDialError(null);
    await unlockAudio();
    await prefetchMicrophoneAccess();

    const res = await apiFetch("/api/calls/dial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tcallId }),
    });
    const data = await parseApiJson<{
      error?: string;
      canMessage?: boolean;
      calleeTcallId?: string;
      callee?: { name?: string; userId?: string; tcallId?: string; language?: string };
      roomId?: string;
      callId?: string;
      delivered?: boolean;
      calleeOnline?: boolean;
    }>(res);
    if (!res.ok) {
      if (data.canMessage && data.calleeTcallId) {
        setQuickMessageTarget({ tcallId: data.calleeTcallId, name: data.callee?.name });
      }
      throw new DialError(data.error || ui.dialError, {
        canMessage: data.canMessage,
        calleeTcallId: data.calleeTcallId,
      });
    }

    if (data.roomId && data.callId && data.callee) {
      setOutgoingCall({
        roomId: data.roomId,
        callId: data.callId,
        callee: {
          userId: data.callee.userId || "",
          name: data.callee.name || "",
          tcallId: data.callee.tcallId || tcallId,
          language: data.callee.language || "uz",
        },
        calleeOnline: data.calleeOnline,
      });
    }

    if (!data.delivered) {
      setDialError(ui.dialCalleeOffline);
    } else if (!socketRef.current?.connected) {
      setDialError(ui.dialSignalLost);
    }

    router.push(`/call/${data.roomId}`);
  }, [router, ui]);

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
        socketConnected,
        getSocket: () => socketRef.current,
        userLanguage,
        userName: user.name,
        activeCall,
        callMinimized,
        activateCall,
        minimizeCall,
        expandCall,
        clearActiveCall,
      }}
    >
      {activeCall ? (
        <ActiveCallEngine
          roomId={activeCall.roomId}
          isHost={activeCall.isHost}
          user={user}
          onEnded={() => {
            clearActiveCall();
            router.replace("/dashboard");
          }}
        >
          {children}
          {callMinimized && <MiniCallBar />}
        </ActiveCallEngine>
      ) : (
        children
      )}

      {dialError && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm text-center">
          {dialError}
        </div>
      )}

      {acceptError && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm text-center">
          {acceptError}
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          userLanguage={userLanguage}
          onAccept={acceptCall}
          onReject={rejectCall}
          accepting={accepting}
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
