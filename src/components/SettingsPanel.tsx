"use client";

import { useState, useEffect } from "react";
import { X, Save, Shield, ShieldOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { LANGUAGES, getUI } from "@/lib/languages";
import { STATUS_OPTIONS, type UserStatus } from "@/lib/status";
import type { User } from "@/hooks/useAuth";

interface SettingsPanelProps {
  user: User;
  userLanguage: string;
  onClose: () => void;
  onUpdate: (updates: Partial<User>) => void;
}

export function SettingsPanel({ user, userLanguage, onClose, onUpdate }: SettingsPanelProps) {
  const ui = getUI(userLanguage);
  const [name, setName] = useState(user.name);
  const [language, setLanguage] = useState(user.language);
  const [translationMode, setTranslationMode] = useState(user.translationMode);
  const [status, setStatus] = useState<UserStatus>("available");
  const [bio, setBio] = useState("");
  const [blocks, setBlocks] = useState<{ blockedTcallId: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockInput, setBlockInput] = useState("");

  useEffect(() => {
    apiFetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.status) setStatus(d.user.status as UserStatus);
        if (d.user?.bio) setBio(d.user.bio);
      });
    apiFetch("/api/blocks")
      .then((r) => r.json())
      .then((d) => setBlocks(d.blocks || []));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language, translationMode, status, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ name, language, translationMode });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async () => {
    const tcallId = blockInput.replace(/\D/g, "");
    if (tcallId.length !== 9) return;
    const res = await apiFetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tcallId }),
    });
    if (res.ok) {
      setBlocks((b) => [...b, { blockedTcallId: tcallId }]);
      setBlockInput("");
    }
  };

  const removeBlock = async (tcallId: string) => {
    await apiFetch(`/api/blocks?tcallId=${tcallId}`, { method: "DELETE" });
    setBlocks((b) => b.filter((x) => x.blockedTcallId !== tcallId));
  };

  return (
    <div className="ios-settings-overlay">
      <div className="ios-settings-panel">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{ui.settings}</h2>
          <button onClick={onClose} className="ios-icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <label className="block">
            <span className="text-xs text-white/50">{ui.name}</span>
            <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block">
            <span className="text-xs text-white/50">{ui.language}</span>
            <select className="input-field mt-1" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-white/50">{ui.translation}</span>
            <select className="input-field mt-1" value={translationMode} onChange={(e) => setTranslationMode(e.target.value)}>
              <option value="text">{ui.textTranslation}</option>
              <option value="voice">{ui.voiceTranslation}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-white/50">{ui.profile}</span>
            <select className="input-field mt-1" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{getStatusLabel(s.value, ui)}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-white/50">{ui.bio}</span>
            <input className="input-field mt-1" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="..." />
          </label>

          <div className="pt-2 border-t border-white/10">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> {ui.blocked}
            </p>
            <div className="flex gap-2 mb-2">
              <input
                className="input-field flex-1 font-mono"
                placeholder="123456789"
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
              />
              <button onClick={addBlock} className="btn-secondary text-sm px-3">{ui.block}</button>
            </div>
            {blocks.map((b) => (
              <div key={b.blockedTcallId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-white/70">{b.blockedTcallId}</span>
                <button onClick={() => removeBlock(b.blockedTcallId)} className="text-red-400 flex items-center gap-1">
                  <ShieldOff className="w-3.5 h-3.5" /> {ui.unblock}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saved ? ui.saved : saving ? "..." : ui.save}
        </button>
      </div>
    </div>
  );
}

function getStatusLabel(status: string, ui: Record<string, string>) {
  const map: Record<string, string> = {
    available: ui.statusAvailable,
    busy: ui.statusBusy,
    dnd: ui.statusDnd,
    away: ui.statusAway,
  };
  return map[status] || status;
}
