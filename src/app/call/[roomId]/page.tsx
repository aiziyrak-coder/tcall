"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getUI } from "@/lib/languages";
import { AudioCallRoom } from "@/components/AudioCallRoom";
import { AppSplash } from "@/components/AppSplash";
import { TcallLogo } from "@/components/TcallLogo";

export default function CallPage({ params }: { params: { roomId: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [joinState, setJoinState] = useState<"loading" | "ready" | "error">("loading");
  const [isHost, setIsHost] = useState(false);
  const [joinError, setJoinError] = useState("");

  const roomId = params.roomId.toUpperCase();
  const ui = getUI(user?.language || "uz");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    apiFetch("/api/calls/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Xatolik");
        setIsHost(data.isHost ?? false);
        setJoinState("ready");
      })
      .catch((e) => {
        setJoinError(e.message);
        setJoinState("error");
      });
  }, [user, roomId]);

  useEffect(() => {
    if (joinState !== "error") return;
    const timer = setTimeout(() => router.replace("/dashboard"), 3000);
    return () => clearTimeout(timer);
  }, [joinState, router]);

  if (loading || !user || joinState === "loading") {
    return <AppSplash message={ui.connecting} />;
  }

  if (joinState === "error") {
    return (
      <div className="phone-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <TcallLogo size="md" animate className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Xatolik</h2>
          <p className="text-slate-500 mb-6">{joinError}</p>
          <p className="text-sm text-slate-400">{ui.returningToDashboard}</p>
        </div>
      </div>
    );
  }

  return <AudioCallRoom roomId={roomId} user={user} isHost={isHost} />;
}
