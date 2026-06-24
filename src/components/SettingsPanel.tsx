"use client";

import { useState, useEffect } from "react";
import { X, Save, Shield, ShieldOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { LANGUAGES, getUI } from "@/lib/languages";
import { STATUS_OPTIONS, type UserStatus } from "@/lib/status";
import { AppCopyright } from "@/components/AppCopyright";
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
    <div className="ios-settings-overlay" onClick={onClose}>
      <div className="ios-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ios-settings-header">
          <h2 className="text-lg font-bold text-slate-900">{ui.settings}</h2>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={ui.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ios-settings-body">
          <div className="settings-grid">
            <label className="settings-field">
              <span className="settings-label">{ui.name}</span>
              <input className="input-field-compact" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.language}</span>
              <select className="input-field-compact" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.translation}</span>
              <select
                className="input-field-compact"
                value={translationMode}
                onChange={(e) => setTranslationMode(e.target.value)}
              >
                <option value="text">{ui.textTranslation}</option>
                <option value="voice">{ui.voiceTranslation}</option>
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.profile}</span>
              <select
                className="input-field-compact"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {getStatusLabel(s.value, ui)}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.bio}</span>
              <input
                className="input-field-compact"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="..."
              />
            </label>

            <div className="settings-block-section">
              <p className="settings-label flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5" /> {ui.blocked}
              </p>
              <div className="settings-block-row">
                <input
                  className="input-field-compact flex-1 min-w-0 font-mono"
                  placeholder="123456789"
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  inputMode="numeric"
                />
                <button type="button" onClick={addBlock} className="btn-secondary btn-compact shrink-0 px-3">
                  {ui.block}
                </button>
              </div>
              {blocks.length > 0 && (
                <ul className="settings-block-list">
                  {blocks.map((b) => (
                    <li key={b.blockedTcallId} className="settings-block-item">
                      <span className="font-mono text-slate-600">{b.blockedTcallId}</span>
                      <button
                        type="button"
                        onClick={() => removeBlock(b.blockedTcallId)}
                        className="text-red-500 text-xs flex items-center gap-1 touch-manipulation"
                      >
                        <ShieldOff className="w-3 h-3" /> {ui.unblock}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <AppCopyright userLanguage={userLanguage} compact className="mt-4 pt-3 border-t border-black/5" />
        </div>

        <div className="ios-settings-footer">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary btn-compact w-full flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saved ? ui.saved : saving ? "..." : ui.save}
          </button>
        </div>
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
