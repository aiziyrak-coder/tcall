"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/api";

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

export function usePresence(userId: string | undefined, translationMode: string) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const socketRef = useState<{ current: Socket | null }>({ current: null })[0];

  useEffect(() => {
    if (!userId) return;

    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register-user", { userId, translationMode });
    });

    socket.on("incoming-call", (data: IncomingCall) => {
      setIncomingCall(data);
    });

    socket.on("call-rejected", () => {
      setIncomingCall(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, translationMode, socketRef]);

  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-reject", {
        roomId: incomingCall.roomId,
        callerId: incomingCall.caller.userId,
      });
    }
    setIncomingCall(null);
  };

  const clearIncoming = () => setIncomingCall(null);

  return { incomingCall, rejectCall, clearIncoming };
}
