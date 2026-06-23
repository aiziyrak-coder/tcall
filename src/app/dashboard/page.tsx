"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  PhoneCall,
  LogOut,
  Copy,
  Check,
  Globe,
  Plus,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getLanguage, getUI } from "@/lib/languages";
import { copyToClipboard } from "@/lib/utils";

interface CallRecord {
  id: string;
  roomId: string;
  status: string;
  createdAt: string;
  host: { name: string; language: string };
  participants: { user: { name: string; language: string } }[];
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRoomId, setLastRoomId] = useState("");
  const [error, setError] = useState("");

  const ui = getUI(user?.language || "uz");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      apiFetch("/api/calls")
        .then((r) => r.json())
        .then((d) => {
          if (d.calls) setCalls(d.calls);
        })
        .catch(() => setError("Ma'lumotlar yuklanmadi"));
    }
  }, [user]);

  const createRoom = async () => {
    setError("");
    setCreating(true);
    try {
      const res = await apiFetch("/api/calls", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setLastRoomId(data.roomId);
      router.push(`/call/${data.roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (code?: string) => {
    const roomCode = (code || joinCode).trim().toUpperCase();
    if (!roomCode) return;

    setError("");
    setJoining(true);
    try {
      const res = await apiFetch("/api/calls/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ui.joinError);
      router.push(`/call/${data.roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.joinError);
    } finally {
      setJoining(false);
    }
  };

  const handleCopyLink = async (roomId: string) => {
    const url = `${window.location.origin}/call/${roomId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userLang = getLanguage(user.language);

  return (
    <div className="page-shell">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <nav className="mobile-nav relative z-10 flex items-center justify-between max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2 touch-manipulation">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
          <span className="font-bold">Tcall</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm text-white/50 truncate max-w-[100px] sm:max-w-none">
            {userLang.flag} {user.name}
          </span>
          <button onClick={logout} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5 min-h-0">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{ui.logout}</span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 safe-bottom">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{ui.dashboard}</h1>
        <p className="text-white/50 text-sm mb-6">
          {ui.yourLanguage}: {userLang.flag} {userLang.name}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mb-5">
              <Plus className="w-6 h-6 text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{ui.createRoom}</h2>
            <p className="text-white/50 text-sm mb-6">{ui.createRoomDesc}</p>
            <button
              onClick={createRoom}
              disabled={creating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-5 h-5" />
              {creating ? "..." : ui.startCall}
            </button>
            {lastRoomId && (
              <button
                onClick={() => handleCopyLink(lastRoomId)}
                className="mt-3 w-full text-sm text-brand-400 flex items-center justify-center gap-1 hover:underline"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? ui.copied : ui.copyLink}
              </button>
            )}
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-5">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{ui.joinCall}</h2>
            <p className="text-white/50 text-sm mb-6">{ui.joinRoomDesc}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="input-field flex-1 uppercase tracking-widest text-center font-mono text-lg"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                placeholder="ABC123"
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
              />
              <button onClick={() => joinRoom()} disabled={joining} className="btn-primary sm:px-6 w-full sm:w-auto">
                {joining ? "..." : ui.joinCall}
              </button>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-12 flex items-start gap-4">
          <Globe className="w-6 h-6 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">{ui.translation}</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              {ui.translationInfo} {ui.translationInfoFull}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">{ui.recentCalls}</h2>
        {calls.length === 0 ? (
          <p className="text-white/40 text-center py-12">{ui.noCalls}</p>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors"
              >
                <div>
                  <span className="font-mono font-semibold text-brand-400">{call.roomId}</span>
                  <p className="text-sm text-white/40 mt-1">
                    {new Date(call.createdAt).toLocaleString()} · {call.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(call.roomId)}
                    className="btn-secondary text-sm py-2 px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => joinRoom(call.roomId)}
                    disabled={joining}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {ui.joinCall}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
