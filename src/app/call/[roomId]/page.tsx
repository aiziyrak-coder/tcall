"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AudioCallRoom } from "@/components/AudioCallRoom";

export default function CallPage({ params }: { params: { roomId: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [joinState, setJoinState] = useState<"loading" | "ready" | "error">("loading");
  const [isHost, setIsHost] = useState(false);
  const [joinError, setJoinError] = useState("");

  const roomId = params.roomId.toUpperCase();

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

  if (loading || !user || joinState === "loading") {
    return (
      <div className="phone-screen flex items-center justify-center">
        <div className="phone-avatar-ring phone-avatar-active">
          <div className="phone-avatar"><span>...</span></div>
        </div>
      </div>
    );
  }

  if (joinState === "error") {
    return (
      <div className="phone-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Xatolik</h2>
          <p className="text-white/50 mb-6">{joinError}</p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary">
            Boshqaruv paneliga qaytish
          </button>
        </div>
      </div>
    );
  }

  return <AudioCallRoom roomId={roomId} user={user} isHost={isHost} />;
}
