"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, parseApiJson } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getUI } from "@/lib/languages";
import { AudioCallRoom } from "@/components/AudioCallRoom";
import { AppSplash } from "@/components/AppSplash";
import { TcallLogo } from "@/components/TcallLogo";
import { useCallContext } from "@/components/providers/CallProvider";
import { extractSubscriptionRequirement, emitSubscriptionRequired } from "@/lib/subscription-required";

function CallPageReady({
  roomId,
  isHost,
  callId,
}: {
  roomId: string;
  isHost: boolean;
  callId?: string;
}) {
  const { activateCall, callMinimized } = useCallContext();

  useEffect(() => {
    activateCall(roomId, isHost, callId);
  }, [roomId, isHost, callId, activateCall]);

  if (callMinimized) return null;

  return <AudioCallRoom />;
}

export default function CallPage({ params }: { params: { roomId: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [joinState, setJoinState] = useState<"loading" | "ready" | "error">("loading");
  const [isHost, setIsHost] = useState(false);
  const [callId, setCallId] = useState<string | undefined>();
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [joinError, setJoinError] = useState("");

  const roomId = params.roomId.toUpperCase();
  const ui = getUI(user?.language || "uz");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setSubscriptionBlocked(false);

    apiFetch("/api/calls/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    })
      .then(async (r) => {
        const data = await parseApiJson<{ error?: string; isHost?: boolean; callId?: string }>(r);
        if (!r.ok) {
          const required = extractSubscriptionRequirement(r.status, data);
          if (required) {
            emitSubscriptionRequired({ ...required, source: "call-page-join" });
            setSubscriptionBlocked(true);
          }
          throw new Error(data.error || ui.genericError);
        }
        setIsHost(data.isHost ?? false);
        setCallId(data.callId);
        setJoinState("ready");
      })
      .catch((e) => {
        setJoinError(e.message);
        setJoinState("error");
      });
  }, [user, roomId]);

  useEffect(() => {
    if (joinState !== "error" || subscriptionBlocked) return;
    const timer = setTimeout(() => router.replace("/dashboard"), 3000);
    return () => clearTimeout(timer);
  }, [joinState, router, subscriptionBlocked]);

  if (loading || !user || joinState === "loading") {
    return <AppSplash message={ui.connecting} />;
  }

  if (joinState === "error") {
    return (
      <div className="phone-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <TcallLogo size="md" animate className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{ui.genericError}</h2>
          <p className="text-slate-500 mb-6">{joinError}</p>
          <p className="text-sm text-slate-400">
            {subscriptionBlocked ? ui.subscriptionRequiredHint : ui.returningToDashboard}
          </p>
        </div>
      </div>
    );
  }

  return <CallPageReady roomId={roomId} isHost={isHost} callId={callId} />;
}
