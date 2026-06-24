"use client";

import { useState, useEffect, useRef } from "react";
import { X, Save, Camera, Trash2 } from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { STATUS_OPTIONS, type UserStatus } from "@/lib/status";
import { AppCopyright } from "@/components/AppCopyright";
import { UserAvatar } from "@/components/UserAvatar";
import type { User } from "@/hooks/useAuth";

interface SettingsPanelProps {
  user: User;
  userLanguage: string;
  onClose: () => void;
  onUpdate: (updates: Partial<User>) => void;
}

interface ProfileForm {
  name: string;
  language: string;
  translationMode: string;
  status: UserStatus;
  bio: string;
  about: string;
  age: string;
  city: string;
  country: string;
  address: string;
  workplace: string;
  education: string;
  graduatedFrom: string;
  profession: string;
  interests: string;
  skills: string;
}

export function SettingsPanel({ user, userLanguage, onClose, onUpdate }: SettingsPanelProps) {
  const ui = useUI(userLanguage);
  const [form, setForm] = useState<ProfileForm>({
    name: user.name,
    language: user.language,
    translationMode: user.translationMode,
    status: "available",
    bio: "",
    about: "",
    age: "",
    city: "",
    country: "",
    address: "",
    workplace: "",
    education: "",
    graduatedFrom: "",
    profession: "",
    interests: "",
    skills: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState(user.userId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (!u) return;
        setForm({
          name: u.name ?? user.name,
          language: u.language ?? user.language,
          translationMode: u.translationMode ?? user.translationMode,
          status: (u.status as UserStatus) ?? "available",
          bio: u.bio ?? "",
          about: u.about ?? "",
          age: u.age != null ? String(u.age) : "",
          city: u.city ?? "",
          country: u.country ?? "",
          address: u.address ?? "",
          workplace: u.workplace ?? "",
          education: u.education ?? "",
          graduatedFrom: u.graduatedFrom ?? "",
          profession: u.profession ?? "",
          interests: u.interests ?? "",
          skills: u.skills ?? "",
        });
        setAvatarUrl(u.avatarUrl ?? null);
        if (u.id) setUserId(u.id);
      });
  }, [user]);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/user/avatar", { method: "POST", body: fd });
      const data = await parseApiJson<{ error?: string; url?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Yuklash xatosi");
      if (data.url) setAvatarUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.chatActionFailed);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await apiFetch("/api/user/avatar", { method: "DELETE" });
      setAvatarUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const ageNum = form.age.trim() ? Number(form.age) : null;
      const res = await apiFetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          language: form.language,
          translationMode: form.translationMode,
          status: form.status,
          bio: form.bio || null,
          about: form.about || null,
          age: ageNum,
          city: form.city || null,
          country: form.country || null,
          address: form.address || null,
          workplace: form.workplace || null,
          education: form.education || null,
          graduatedFrom: form.graduatedFrom || null,
          profession: form.profession || null,
          interests: form.interests || null,
          skills: form.skills || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ name: form.name, language: form.language, translationMode: form.translationMode });
      if (data.user?.avatarUrl != null) setAvatarUrl(data.user.avatarUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.chatActionFailed);
    } finally {
      setSaving(false);
    }
  };

  const profileFields: { key: keyof ProfileForm; label: string; multiline?: boolean; max?: number }[] = [
    { key: "age", label: ui.profileAge, max: 3 },
    { key: "city", label: ui.profileCity, max: 80 },
    { key: "country", label: ui.profileCountry, max: 80 },
    { key: "address", label: ui.profileAddress, max: 160 },
    { key: "workplace", label: ui.profileWorkplace, max: 120 },
    { key: "education", label: ui.profileEducation, max: 120 },
    { key: "graduatedFrom", label: ui.profileGraduatedFrom, max: 120 },
    { key: "profession", label: ui.profileProfession, max: 80 },
    { key: "interests", label: ui.profileInterests, multiline: true, max: 300 },
    { key: "skills", label: ui.profileSkills, multiline: true, max: 300 },
    { key: "about", label: ui.profileAbout, multiline: true, max: 300 },
    { key: "bio", label: ui.profileStatusLine, max: 120 },
  ];

  return (
    <div className="ios-settings-overlay" onClick={onClose}>
      <div className="ios-settings-panel ios-settings-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="ios-settings-header">
          <h2 className="text-lg font-bold text-slate-900">{ui.settings}</h2>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={ui.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ios-settings-body">
          {error && <div className="ios-error-banner mb-3">{error}</div>}

          <section className="settings-profile-hero">
            <UserAvatar userId={userId} name={form.name} avatar={avatarUrl} size="xl" />
            <div className="settings-avatar-actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn-secondary btn-compact text-xs"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="w-3.5 h-3.5" />
                {uploading ? ui.photoUploading : ui.changePhoto}
              </button>
              {avatarUrl && (
                <button type="button" className="btn-secondary btn-compact text-xs text-red-600" disabled={uploading} onClick={() => void removeAvatar()}>
                  <Trash2 className="w-3.5 h-3.5" /> {ui.removePhoto}
                </button>
              )}
            </div>
          </section>

          <p className="settings-section-label">{ui.profileEdit}</p>
          <div className="settings-grid">
            <label className="settings-field">
              <span className="settings-label">{ui.name}</span>
              <input className="input-field-compact" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </label>

            {profileFields.map(({ key, label, multiline, max }) => (
              <label key={key} className={`settings-field ${multiline ? "settings-field-full" : ""}`}>
                <span className="settings-label">{label}</span>
                {multiline ? (
                  <textarea
                    className="input-field-compact min-h-[72px] resize-none"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    maxLength={max}
                  />
                ) : (
                  <input
                    className="input-field-compact"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    maxLength={max}
                    inputMode={key === "age" ? "numeric" : undefined}
                  />
                )}
              </label>
            ))}
          </div>

          <p className="settings-section-label mt-4">{ui.settings}</p>
          <div className="settings-grid">
            <label className="settings-field">
              <span className="settings-label">{ui.language}</span>
              <select className="input-field-compact" value={form.language} onChange={(e) => setField("language", e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.translation}</span>
              <select className="input-field-compact" value={form.translationMode} onChange={(e) => setField("translationMode", e.target.value)}>
                <option value="text">{ui.textTranslation}</option>
                <option value="voice">{ui.voiceTranslation}</option>
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">{ui.profile}</span>
              <select className="input-field-compact" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{getStatusLabel(s.value, ui)}</option>
                ))}
              </select>
            </label>
          </div>

          <AppCopyright userLanguage={userLanguage} compact className="mt-4 pt-3 border-t border-black/5" />
        </div>

        <div className="ios-settings-footer">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || uploading}
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
