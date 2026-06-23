"use client";

import { useState } from "react";
import { Link2, Plus, Copy, Check, Share2, LogIn } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getUI } from "@/lib/languages";
import { copyToClipboard } from "@/lib/utils";

interface RoomPanelProps {
  userLanguage: string;
}

export function RoomPanel({ userLanguage }: RoomPanelProps) {
  const ui = getUI(userLanguage);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);

  const createRoom = async () => {
    setError("");
    setCreating(true);
    try {
      const res = await apiFetch("/api/calls", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      const link = `${window.location.origin}/call/${data.roomId}`;
      setRoomLink(link);
      setRoomId(data.roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setError("");
    setJoining(true);
    try {
      const res = await apiFetch("/api/calls/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ui.joinError);
      window.location.href = `/call/${data.roomId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.joinError);
    } finally {
      setJoining(false);
    }
  };

  const copyLink = async () => {
    const text = roomLink || `${window.location.origin}/call/${roomId}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    const url = roomLink || `${window.location.origin}/call/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tcall", text: ui.shareLink, url });
        return;
      } catch { /* fallback */ }
    }
    copyLink();
  };

  return (
    <div className="ios-room-panel">
      {error && (
        <div className="ios-error-banner">{error}</div>
      )}

      <div className="ios-room-card">
        <div className="ios-room-icon bg-brand-600/20">
          <Plus className="w-6 h-6 text-brand-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{ui.createRoom}</h3>
          <p className="text-white/45 text-xs mt-0.5">{ui.createRoomDesc}</p>
        </div>
        <button onClick={createRoom} disabled={creating} className="ios-room-action-btn">
          {creating ? "..." : ui.startCall}
        </button>
      </div>

      {roomId && (
        <div className="ios-room-created animate-fade-in">
          <p className="text-xs text-white/40 mb-1">{ui.roomLinkReady}</p>
          <p className="font-mono text-xl font-bold text-brand-300 tracking-widest">{roomId}</p>
          <p className="text-xs text-white/30 mt-2 break-all">{roomLink}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={copyLink} className="btn-secondary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 min-h-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? ui.copied : ui.copyLink}
            </button>
            <button onClick={shareLink} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 min-h-0">
              <Share2 className="w-4 h-4" /> {ui.shareLink}
            </button>
            <button
              onClick={() => { window.location.href = `/call/${roomId}`; }}
              className="btn-primary text-sm py-2.5 px-4 min-h-0"
            >
              {ui.joinCall}
            </button>
          </div>
        </div>
      )}

      <div className="ios-room-card mt-3">
        <div className="ios-room-icon bg-purple-600/20">
          <LogIn className="w-6 h-6 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{ui.joinCall}</h3>
          <p className="text-white/45 text-xs mt-0.5">{ui.joinRoomDesc}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="input-field flex-1 uppercase tracking-widest text-center font-mono"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          placeholder="ABC123"
          maxLength={6}
          inputMode="text"
        />
        <button onClick={joinRoom} disabled={joining} className="btn-primary px-5 min-h-0">
          {joining ? "..." : ui.joinCall}
        </button>
      </div>

      <div className="ios-room-info mt-6">
        <Link2 className="w-4 h-4 text-brand-400 shrink-0" />
        <p className="text-xs text-white/45 leading-relaxed">{ui.roomInfo}</p>
      </div>
    </div>
  );
}
