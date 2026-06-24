"use client";

import { useState } from "react";
import {
  Plus,
  Copy,
  Check,
  Share2,
  LogIn,
  Sparkles,
  ArrowRight,
  Link2,
  Users,
} from "lucide-react";
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
      } catch {
        /* fallback */
      }
    }
    copyLink();
  };

  const enterRoom = () => {
    window.location.href = `/call/${roomId}`;
  };

  return (
    <div className="room-panel">
      {error && <div className="ios-error-banner">{error}</div>}

      <div className="room-hero">
        <div className="room-hero-badge">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI tarjima</span>
        </div>
        <h2 className="room-hero-title">{ui.roomHeroTitle}</h2>
        <p className="room-hero-desc">{ui.roomHeroDesc}</p>
      </div>

      {!roomId ? (
        <section className="room-card room-card-create">
          <div className="room-card-head">
            <div className="room-icon room-icon-brand">
              <Plus className="w-5 h-5" />
            </div>
            <div className="room-card-text">
              <h3>{ui.createRoom}</h3>
              <p>{ui.createRoomDesc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={createRoom}
            disabled={creating}
            className="room-btn room-btn-primary room-btn-block"
          >
            {creating ? ui.loading : ui.startCall}
            {!creating && <ArrowRight className="w-4 h-4" />}
          </button>
        </section>
      ) : (
        <section className="room-card room-card-active animate-fade-in">
          <div className="room-active-label">
            <Users className="w-4 h-4 text-brand-600" />
            <span>{ui.roomLinkReady}</span>
          </div>
          <p className="room-code">{roomId}</p>
          <div className="room-link-box">
            <Link2 className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="room-link-text">{roomLink}</span>
          </div>
          <div className="room-action-stack">
            <button type="button" onClick={copyLink} className="room-btn room-btn-secondary room-btn-block">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? ui.copied : ui.copyLinkShort}
            </button>
            <button type="button" onClick={shareLink} className="room-btn room-btn-outline room-btn-block">
              <Share2 className="w-4 h-4" />
              {ui.shareLinkShort}
            </button>
            <button type="button" onClick={enterRoom} className="room-btn room-btn-primary room-btn-block">
              {ui.enterRoom}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <button type="button" onClick={createRoom} disabled={creating} className="room-new-link">
            {ui.createNewRoom}
          </button>
        </section>
      )}

      <section className="room-card">
        <div className="room-card-head">
          <div className="room-icon room-icon-purple">
            <LogIn className="w-5 h-5" />
          </div>
          <div className="room-card-text">
            <h3>{ui.joinCall}</h3>
            <p>{ui.joinRoomDesc}</p>
          </div>
        </div>
        <div className="room-join-form">
          <input
            className="room-code-input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            placeholder={ui.roomCodePlaceholder}
            maxLength={8}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={joinRoom}
            disabled={joining || joinCode.length < 6}
            className="room-btn room-btn-primary room-btn-block"
          >
            {joining ? ui.loading : ui.joinCall}
          </button>
        </div>
      </section>

      <div className="room-tip">
        <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p>{ui.roomInfo}</p>
      </div>
    </div>
  );
}
