"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, LogOut, History, Copy, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import { copyToClipboard } from "@/lib/utils";
import { Dialer } from "@/components/Dialer";
import { VanityShop } from "@/components/VanityShop";
import { IncomingCallModal } from "@/components/IncomingCallModal";

interface CallRecord {
  id: string;
  roomId: string;
  status: string;
  createdAt: string;
  calleeTcallId?: string;
  host: { name: string; language: string; tcallId: string };
  participants: { user: { name: string; language: string; tcallId: string } }[];
}

export default function DashboardPage() {
  const { user, loading, logout, setUser } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [calling, setCalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"dialer" | "history" | "numbers">("dialer");

  const { incomingCall, rejectCall, clearIncoming } = usePresence(
    user?.userId,
    user?.translationMode || "text"
  );

  const ui = getUI(user?.language || "uz");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      apiFetch("/api/calls")
        .then((r) => r.json())
        .then((d) => { if (d.calls) setCalls(d.calls); })
        .catch(() => {});
    }
  }, [user]);

  const dial = async (tcallId: string) => {
    setError("");
    setCalling(true);
    try {
      const res = await apiFetch("/api/calls/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcallId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.push(`/call/${data.roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCalling(false);
    }
  };

  const copyId = async () => {
    if (!user?.tcallId) return;
    const ok = await copyToClipboard(user.tcallId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const acceptIncoming = () => {
    if (incomingCall) {
      clearIncoming();
      router.push(`/call/${incomingCall.roomId}`);
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
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/30 via-slate-950 to-slate-950 pointer-events-none" />

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          userLanguage={user.language}
          onAccept={acceptIncoming}
          onReject={rejectCall}
        />
      )}

      <nav className="mobile-nav relative z-10 flex items-center justify-between max-w-lg mx-auto px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
          <span className="font-bold">Tcall</span>
        </Link>
        <button onClick={logout} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <LogOut className="w-4 h-4" />
        </button>
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-4 pb-8 safe-bottom">
        <div className="text-center mb-6">
          <p className="text-white/50 text-sm">{ui.yourNumber}</p>
          <button onClick={copyId} className="flex items-center justify-center gap-2 mx-auto mt-1 group">
            <span className="text-3xl font-mono font-bold text-brand-300 tracking-wider">
              {user.tcallId ? formatTcallId(user.tcallId) : "..."}
            </span>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60" />}
          </button>
          <p className="text-xs text-white/40 mt-1">{userLang.flag} {user.name}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl">
          {(["dialer", "history", "numbers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-brand-600 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t === "dialer" ? ui.dialer : t === "history" ? ui.history : ui.vanityNumbers}
            </button>
          ))}
        </div>

        {tab === "dialer" && (
          <Dialer userLanguage={user.language} onCall={dial} calling={calling} />
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {calls.length === 0 ? (
              <p className="text-white/40 text-center py-12">{ui.noCalls}</p>
            ) : (
              calls.map((call) => {
                const partner =
                  call.host.tcallId !== user.tcallId
                    ? call.host
                    : call.participants.find((p) => p.user.tcallId !== user.tcallId)?.user;
                return (
                  <div key={call.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{partner?.name || ui.unknown}</p>
                      <p className="text-xs text-white/40 font-mono">
                        {partner?.tcallId ? formatTcallId(partner.tcallId) : ""}
                      </p>
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(call.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => partner?.tcallId && dial(partner.tcallId)}
                      className="w-11 h-11 rounded-full bg-green-600 flex items-center justify-center"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "numbers" && (
          <VanityShop
            userLanguage={user.language}
            currentId={user.tcallId}
            onPurchased={(newId) => setUser({ ...user, tcallId: newId })}
          />
        )}
      </main>
    </div>
  );
}
