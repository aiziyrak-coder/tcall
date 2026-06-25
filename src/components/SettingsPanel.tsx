"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Camera,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  SlidersHorizontal,
  Shield,
  KeyRound,
  Bell,
  LogOut,
  Crown,
} from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";
import { prepareAvatarFile } from "@/lib/prepare-avatar-file";
import { LANGUAGES } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { STATUS_OPTIONS, type UserStatus } from "@/lib/status";
import { AppCopyright } from "@/components/AppCopyright";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth, type User } from "@/hooks/useAuth";
import { emitSubscriptionRequired } from "@/lib/subscription-required";

interface SettingsPanelProps {
  user: User;
  userLanguage: string;
  onClose: () => void;
  onUpdate: (updates: Partial<User>) => void;
}

type SettingsSection =
  | "overview"
  | "my_info"
  | "profile_details"
  | "preferences"
  | "notifications"
  | "password"
  | "security";

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

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface InlineNotice {
  type: "success" | "error";
  text: string;
}

interface SettingsExtraCopy {
  profileDetailsTitle: string;
  profileDetailsHint: string;
  notificationsTitle: string;
  notificationsHint: string;
  passwordTitle: string;
  passwordHint: string;
  accountTitle: string;
  accountHint: string;
  accountInfoTitle: string;
}

const SETTINGS_EXTRA_TEXT: Record<"uz" | "ru" | "en", SettingsExtraCopy> = {
  uz: {
    profileDetailsTitle: "Profil tafsilotlari",
    profileDetailsHint: "Yosh, yashash manzili, ish va ta'lim",
    notificationsTitle: "Bildirishnomalar",
    notificationsHint: "Push va brauzer ruxsatlarini boshqarish",
    passwordTitle: "Parolni o'zgartirish",
    passwordHint: "Hisob xavfsizligi uchun yangi parol o'rnating",
    accountTitle: "Hisob va chiqish",
    accountHint: "Hisob ma'lumotlari va sessiyani boshqarish",
    accountInfoTitle: "Hisob ma'lumotlari",
  },
  ru: {
    profileDetailsTitle: "Детали профиля",
    profileDetailsHint: "Возраст, адрес, работа и образование",
    notificationsTitle: "Уведомления",
    notificationsHint: "Управление push и разрешениями браузера",
    passwordTitle: "Сменить пароль",
    passwordHint: "Обновите пароль для безопасности аккаунта",
    accountTitle: "Аккаунт и выход",
    accountHint: "Данные аккаунта и управление сессией",
    accountInfoTitle: "Информация аккаунта",
  },
  en: {
    profileDetailsTitle: "Profile Details",
    profileDetailsHint: "Age, address, work, and education",
    notificationsTitle: "Notifications",
    notificationsHint: "Manage push and browser permissions",
    passwordTitle: "Change Password",
    passwordHint: "Set a new password to secure your account",
    accountTitle: "Account & Sign Out",
    accountHint: "Account details and session controls",
    accountInfoTitle: "Account Information",
  },
};

function getSettingsExtraText(lang: string): SettingsExtraCopy {
  const code = lang.split("-")[0].toLowerCase();
  if (code === "uz" || code === "ru" || code === "en") return SETTINGS_EXTRA_TEXT[code];
  return SETTINGS_EXTRA_TEXT.en;
}

export function SettingsPanel({ user, userLanguage, onClose, onUpdate }: SettingsPanelProps) {
  const ui = useUI(userLanguage);
  const extra = getSettingsExtraText(userLanguage);
  const { logout } = useAuth();
  const [section, setSection] = useState<SettingsSection>("overview");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPhrase, setLogoutPhrase] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [notice, setNotice] = useState<InlineNotice | null>(null);
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
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
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

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
        throw new Error("Faqat rasm fayli yuklash mumkin (JPG, PNG, HEIC...)");
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error("Rasm hajmi 15MB dan oshmasligi kerak");
      }
      const prepared = await prepareAvatarFile(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const res = await apiFetch("/api/user/avatar", { method: "POST", body: fd });
      const data = await parseApiJson<{ error?: string; url?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Yuklash xatosi");
      if (data.url) setAvatarUrl(`${data.url}?v=${Date.now()}`);
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
      const rawAge = form.age.replace(/\D/g, "").trim();
      const ageNum = rawAge ? Math.max(13, Math.min(120, Number(rawAge))) : null;
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
      setNotice({ type: "success", text: ui.saved });
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.chatActionFailed);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setError("");
    setNotice(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setNotice({ type: "error", text: ui.settingsPasswordFillAll });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setNotice({ type: "error", text: ui.settingsPasswordMinLen });
      return;
    }
    if (!/\d/.test(passwordForm.newPassword) || !/[a-zA-Z]/.test(passwordForm.newPassword)) {
      setNotice({ type: "error", text: ui.settingsPasswordWeak });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", text: ui.settingsPasswordMismatch });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiFetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ui.chatActionFailed);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice({ type: "success", text: ui.settingsPasswordChanged });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : ui.chatActionFailed });
    } finally {
      setChangingPassword(false);
    }
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  const profileMainFields: { key: keyof ProfileForm; label: string; multiline?: boolean; max?: number }[] = [
    { key: "bio", label: ui.profileStatusLine, max: 120 },
    { key: "about", label: ui.profileAbout, multiline: true, max: 300 },
    { key: "interests", label: ui.profileInterests, multiline: true, max: 300 },
    { key: "skills", label: ui.profileSkills, multiline: true, max: 300 },
  ];

  const profileDetailFields: { key: keyof ProfileForm; label: string; multiline?: boolean; max?: number }[] = [
    { key: "age", label: ui.profileAge, max: 3 },
    { key: "city", label: ui.profileCity, max: 80 },
    { key: "country", label: ui.profileCountry, max: 80 },
    { key: "address", label: ui.profileAddress, max: 160 },
    { key: "workplace", label: ui.profileWorkplace, max: 120 },
    { key: "education", label: ui.profileEducation, max: 120 },
    { key: "graduatedFrom", label: ui.profileGraduatedFrom, max: 120 },
    { key: "profession", label: ui.profileProfession, max: 80 },
  ];

  const sectionTitle: Record<SettingsSection, string> = {
    overview: ui.settings,
    my_info: ui.settingsMyInfo,
    profile_details: extra.profileDetailsTitle,
    preferences: ui.settingsPreferences,
    notifications: extra.notificationsTitle,
    password: extra.passwordTitle,
    security: extra.accountTitle,
  };
  const langCode = userLanguage.split("-")[0].toLowerCase();
  const subscriptionNavTitle =
    langCode === "ru" ? "Подписка" : langCode === "en" ? "Subscription" : "Obuna";
  const subscriptionNavHint =
    langCode === "ru"
      ? "Тарифы Premium / Premium+"
      : langCode === "en"
        ? "Premium / Premium+ plans"
        : "Premium / Premium+ tariflari";

  const renderLogoutBlock = () => (
    <section className="settings-security-card">
      <p className="settings-section-label">{ui.logout}</p>
      {!logoutOpen ? (
        <button
          type="button"
          className="settings-danger-btn"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="w-4 h-4" />
          {ui.logoutFromSettings}
        </button>
      ) : (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 space-y-3">
          <p className="text-sm text-red-700">{ui.logoutConfirmHint}</p>
          <input
            className="input-field-compact w-full uppercase tracking-wider"
            value={logoutPhrase}
            onChange={(e) => setLogoutPhrase(e.target.value.toUpperCase())}
            placeholder={ui.logoutTypePhrase}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary btn-compact flex-1"
              onClick={() => {
                setLogoutOpen(false);
                setLogoutPhrase("");
              }}
            >
              {ui.logoutCancel}
            </button>
            <button
              type="button"
              className="btn-compact flex-1 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-40"
              disabled={logoutPhrase.trim() !== (ui.logoutTypePhrase as string).trim() || loggingOut}
              onClick={() => {
                setLoggingOut(true);
                void logout();
              }}
            >
              {loggingOut ? "..." : ui.logoutConfirmAction}
            </button>
          </div>
        </div>
      )}
    </section>
  );

  const renderOverview = () => (
    <>
      <section className="settings-profile-hero settings-profile-hero-compact">
        <UserAvatar userId={userId} name={form.name} avatar={avatarUrl} size="xl" />
        <div className="text-center">
          <p className="font-semibold text-slate-900">{form.name}</p>
          <p className="text-xs text-slate-500 font-mono">{user.email}</p>
          <p className="text-[11px] text-brand-600 mt-1">
            {ui.yourNumber}: <span className="font-mono">{user.tcallId}</span>
          </p>
        </div>
      </section>

      <div className="settings-nav-list">
        <button type="button" className="settings-nav-item" onClick={() => setSection("my_info")}>
          <span className="settings-nav-icon"><UserCircle2 className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{ui.settingsMyInfo}</strong>
            <small>{ui.settingsMyInfoHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button type="button" className="settings-nav-item" onClick={() => setSection("profile_details")}>
          <span className="settings-nav-icon"><UserCircle2 className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{extra.profileDetailsTitle}</strong>
            <small>{extra.profileDetailsHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button type="button" className="settings-nav-item" onClick={() => setSection("preferences")}>
          <span className="settings-nav-icon"><SlidersHorizontal className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{ui.settingsPreferences}</strong>
            <small>{ui.settingsPreferencesHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button type="button" className="settings-nav-item" onClick={() => setSection("notifications")}>
          <span className="settings-nav-icon"><Bell className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{extra.notificationsTitle}</strong>
            <small>{extra.notificationsHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button type="button" className="settings-nav-item" onClick={() => setSection("password")}>
          <span className="settings-nav-icon"><KeyRound className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{extra.passwordTitle}</strong>
            <small>{extra.passwordHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          className="settings-nav-item"
          onClick={() =>
            emitSubscriptionRequired({ requiredPlan: "premium", source: "settings" })
          }
        >
          <span className="settings-nav-icon"><Crown className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{subscriptionNavTitle}</strong>
            <small>{subscriptionNavHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button type="button" className="settings-nav-item" onClick={() => setSection("security")}>
          <span className="settings-nav-icon"><Shield className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{extra.accountTitle}</strong>
            <small>{extra.accountHint}</small>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <AppCopyright userLanguage={userLanguage} compact className="mt-4 pt-3 border-t border-black/5" />
    </>
  );

  const renderMyInfo = () => (
    <>
      <section className="settings-profile-hero">
        <UserAvatar userId={userId} name={form.name} avatar={avatarUrl} size="xl" />
        <div className="settings-avatar-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif,.HEIC,.HEIF"
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

      <div className="settings-grid">
        <label className="settings-field">
          <span className="settings-label">{ui.name}</span>
          <input className="input-field-compact" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </label>

        {profileMainFields.map(({ key, label, multiline, max }) => (
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
                onChange={(e) =>
                  setField(key, key === "age" ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)
                }
                maxLength={max}
                inputMode={key === "age" ? "numeric" : undefined}
                pattern={key === "age" ? "[0-9]*" : undefined}
              />
            )}
          </label>
        ))}
      </div>
    </>
  );

  const renderProfileDetails = () => (
    <div className="settings-grid">
      {profileDetailFields.map(({ key, label, multiline, max }) => (
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
              onChange={(e) =>
                setField(key, key === "age" ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)
              }
              maxLength={max}
              inputMode={key === "age" ? "numeric" : undefined}
              pattern={key === "age" ? "[0-9]*" : undefined}
            />
          )}
        </label>
      ))}
    </div>
  );

  const renderPreferences = () => (
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
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <section className="settings-security-card">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-brand-600" />
          <p className="font-semibold text-slate-900">{extra.notificationsTitle}</p>
        </div>
        <p className="text-xs text-slate-500 mb-3">{extra.notificationsHint}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="settings-label mb-0">{ui.enableNotifications}</p>
          <button
            type="button"
            className="btn-secondary btn-compact text-xs"
            onClick={() => void requestNotifications()}
            disabled={notifPermission === "unsupported"}
          >
            <Bell className="w-3.5 h-3.5" />
            {ui.settingsNotificationsButton}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {notifPermission === "granted"
            ? ui.notificationsEnabled
            : notifPermission === "denied"
              ? ui.notificationsBlocked
              : notifPermission === "unsupported"
                ? ui.settingsNotificationsUnsupported
                : ui.settingsNotificationsAsk}
        </p>
      </section>
    </div>
  );

  const renderPassword = () => (
    <section className="settings-security-card">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-brand-600" />
        <p className="font-semibold text-slate-900">{ui.settingsPasswordTitle}</p>
      </div>
      <div className="space-y-2.5">
        <input
          type="password"
          className="input-field-compact"
          placeholder={ui.settingsCurrentPassword}
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
          autoComplete="current-password"
        />
        <input
          type="password"
          className="input-field-compact"
          placeholder={ui.settingsNewPassword}
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
          autoComplete="new-password"
        />
        <input
          type="password"
          className="input-field-compact"
          placeholder={ui.settingsConfirmPassword}
          value={passwordForm.confirmPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="btn-primary btn-compact w-full"
          onClick={() => void changePassword()}
          disabled={changingPassword}
        >
          {changingPassword ? "..." : ui.settingsChangePassword}
        </button>
      </div>
    </section>
  );

  const renderSecurity = () => (
    <div className="space-y-4">
      <section className="settings-security-card">
        <p className="settings-section-label">{extra.accountInfoTitle}</p>
        <div className="settings-row">
          <span className="text-slate-500 text-sm">{ui.name}</span>
          <span className="font-medium text-slate-900 text-sm">{form.name || "-"}</span>
        </div>
        <div className="settings-row">
          <span className="text-slate-500 text-sm">{ui.email}</span>
          <span className="font-medium text-slate-900 text-sm break-all text-right">{user.email}</span>
        </div>
        <div className="settings-row">
          <span className="text-slate-500 text-sm">{ui.yourNumber}</span>
          <span className="font-mono text-slate-900 text-sm">{user.tcallId || "-"}</span>
        </div>
      </section>

      {renderLogoutBlock()}
    </div>
  );

  const showSaveFooter =
    section === "my_info" ||
    section === "profile_details" ||
    section === "preferences";

  return (
    <div className="ios-settings-overlay" onClick={onClose}>
      <div className="ios-settings-panel ios-settings-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="ios-settings-header">
          <div className="flex items-center gap-2 min-w-0">
            {section !== "overview" && (
              <button
                type="button"
                onClick={() => setSection("overview")}
                className="ios-icon-btn shrink-0"
                aria-label={ui.backToDashboard}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-900 truncate">{sectionTitle[section]}</h2>
          </div>
          <button type="button" onClick={onClose} className="ios-icon-btn shrink-0" aria-label={ui.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ios-settings-body">
          {error && <div className="ios-error-banner mb-3">{error}</div>}
          {notice && (
            <div className={`${notice.type === "error" ? "ios-error-banner" : "ios-success-banner"} mb-3`}>
              {notice.text}
            </div>
          )}

          {section === "overview" && renderOverview()}
          {section === "my_info" && renderMyInfo()}
          {section === "profile_details" && renderProfileDetails()}
          {section === "preferences" && renderPreferences()}
          {section === "notifications" && renderNotifications()}
          {section === "password" && renderPassword()}
          {section === "security" && renderSecurity()}
        </div>

        <div className="ios-settings-footer">
          {showSaveFooter ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || uploading}
              className="btn-primary btn-compact w-full flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "..." : ui.save}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary btn-compact w-full">
              {ui.close}
            </button>
          )}
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
