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
  Headset,
  Send,
  Lock,
  ScanFace,
} from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";
import { FaceCapture } from "@/components/FaceCapture";
import { setCachedPinEnabled } from "@/lib/app-lock";
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
  | "applock"
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
  telegramUsername: string;
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
    telegramUsername: "",
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

  // App lock (PIN) state
  const [pinStatus, setPinStatus] = useState<{ enabled: boolean; faceEnrolled: boolean } | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNew, setPinNew] = useState("");
  const [pinNew2, setPinNew2] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinFace, setPinFace] = useState<{ image: string; descriptor: number[] | null } | null>(null);
  const [faceMode, setFaceMode] = useState<null | "enroll" | "update">(null);

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
          telegramUsername: u.telegramUsername ?? "",
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
          telegramUsername: form.telegramUsername || null,
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

  const loadPinStatus = async () => {
    try {
      const r = await apiFetch("/api/security/pin");
      if (!r.ok) return;
      const d = await r.json();
      setPinStatus({ enabled: !!d.enabled, faceEnrolled: !!d.faceEnrolled });
      setCachedPinEnabled(!!d.enabled);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (section === "applock" && !pinStatus) void loadPinStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const resetPinForms = () => {
    setPinNew("");
    setPinNew2("");
    setPinCurrent("");
    setPinFace(null);
  };

  const enablePin = async () => {
    setNotice(null);
    if (!/^\d{4}$/.test(pinNew)) return setNotice({ type: "error", text: "PIN 4 ta raqamdan iborat bo'lishi kerak" });
    if (pinNew !== pinNew2) return setNotice({ type: "error", text: "PIN lar mos kelmadi" });
    setPinBusy(true);
    try {
      const r = await apiFetch("/api/security/pin", {
        method: "POST",
        body: JSON.stringify({
          pin: pinNew,
          faceImage: pinFace?.image,
          faceDescriptor: pinFace?.descriptor ?? undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Xatolik");
      setCachedPinEnabled(true);
      setPinStatus({ enabled: true, faceEnrolled: !!pinFace });
      resetPinForms();
      setNotice({ type: "success", text: "Ilova qulfi yoqildi" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setPinBusy(false);
    }
  };

  const changePin = async () => {
    setNotice(null);
    if (!/^\d{4}$/.test(pinCurrent)) return setNotice({ type: "error", text: "Joriy PIN noto'g'ri" });
    if (!/^\d{4}$/.test(pinNew)) return setNotice({ type: "error", text: "Yangi PIN 4 ta raqam bo'lishi kerak" });
    if (pinNew !== pinNew2) return setNotice({ type: "error", text: "PIN lar mos kelmadi" });
    setPinBusy(true);
    try {
      const r = await apiFetch("/api/security/pin", {
        method: "PUT",
        body: JSON.stringify({ currentPin: pinCurrent, pin: pinNew }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Xatolik");
      resetPinForms();
      setNotice({ type: "success", text: "PIN o'zgartirildi" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setPinBusy(false);
    }
  };

  const disablePin = async () => {
    setNotice(null);
    if (!/^\d{4}$/.test(pinCurrent)) return setNotice({ type: "error", text: "PIN ni kiriting" });
    setPinBusy(true);
    try {
      const r = await apiFetch("/api/security/pin", {
        method: "DELETE",
        body: JSON.stringify({ pin: pinCurrent }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Xatolik");
      setCachedPinEnabled(false);
      setPinStatus({ enabled: false, faceEnrolled: pinStatus?.faceEnrolled ?? false });
      resetPinForms();
      setNotice({ type: "success", text: "Ilova qulfi o'chirildi" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setPinBusy(false);
    }
  };

  const updateFace = async (image: string, descriptor: number[] | null) => {
    setNotice(null);
    if (!/^\d{4}$/.test(pinCurrent)) {
      setNotice({ type: "error", text: "Yuzni yangilash uchun avval joriy PIN ni kiriting" });
      return;
    }
    setPinBusy(true);
    try {
      const r = await apiFetch("/api/security/pin", {
        method: "PATCH",
        body: JSON.stringify({ currentPin: pinCurrent, faceImage: image, faceDescriptor: descriptor ?? undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Xatolik");
      setPinStatus((s) => (s ? { ...s, faceEnrolled: true } : { enabled: true, faceEnrolled: true }));
      setNotice({ type: "success", text: "Yuz yangilandi" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setPinBusy(false);
    }
  };

  const handleFaceCaptured = (result: { image: string; descriptor: number[] | null }) => {
    const mode = faceMode;
    setFaceMode(null);
    if (mode === "enroll") {
      setPinFace(result);
    } else if (mode === "update") {
      void updateFace(result.image, result.descriptor);
    }
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
    applock: "Ilova qulfi",
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
  const supportNavTitle = langCode === "ru" ? "Поддержка" : langCode === "en" ? "Support" : "Bog'lanish";
  const supportNavHint =
    langCode === "ru" ? "Чат с админом (перевод авто)"
      : langCode === "en" ? "Chat with admin (auto-translated)"
        : "Admin bilan chat (avto-tarjima)";
  const telegramLabel = "Telegram username";
  const telegramHint =
    langCode === "ru" ? "Уведомления Tcall будут приходить и в Telegram"
      : langCode === "en" ? "Tcall notifications will also arrive in Telegram"
        : "Tcall bildirishnomalari Telegramingizga ham keladi";

  const openSupport = () => {
    onClose();
    setTimeout(() => window.dispatchEvent(new CustomEvent("tcall:open-support")), 100);
  };

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

        <button type="button" className="settings-nav-item" onClick={() => setSection("applock")}>
          <span className="settings-nav-icon"><Lock className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>Ilova qulfi (PIN)</strong>
            <small>4 xonali PIN, yuz orqali tiklash</small>
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

        <button type="button" className="settings-nav-item" onClick={openSupport}>
          <span className="settings-nav-icon"><Headset className="w-4 h-4" /></span>
          <span className="settings-nav-text">
            <strong>{supportNavTitle}</strong>
            <small>{supportNavHint}</small>
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

      <label className="settings-field settings-field-full">
        <span className="settings-label flex items-center gap-1.5"><Send className="w-3.5 h-3.5 text-sky-500" /> {telegramLabel}</span>
        <input
          className="input-field-compact"
          value={form.telegramUsername}
          onChange={(e) => setField("telegramUsername", e.target.value.replace(/^@+/, "").replace(/\s/g, ""))}
          placeholder="username"
          maxLength={64}
          autoCapitalize="none"
          spellCheck={false}
        />
        <span className="text-xs text-slate-500 mt-1">{telegramHint}</span>
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

  const renderAppLock = () => (
    <div className="space-y-4">
      <section className="settings-security-card">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-brand-600" />
          <p className="font-semibold text-slate-900">Ilova qulfi</p>
          {pinStatus?.enabled && (
            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Yoqilgan
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Telegram’dagidek — ilovani 4 xonali PIN bilan himoyalang. Ilova har ochilganda PIN so‘raladi.
          PINni unutsangiz, yuzingiz orqali (AI + admin tasdig‘i bilan) tiklaysiz.
        </p>
      </section>

      {pinStatus === null ? (
        <p className="text-sm text-slate-400 text-center py-4">Yuklanmoqda...</p>
      ) : !pinStatus.enabled ? (
        <section className="settings-security-card space-y-2.5">
          <p className="settings-section-label">Yangi PIN o‘rnatish</p>
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            className="input-field-compact text-center tracking-[0.4em]"
            placeholder="4 xonali PIN"
            value={pinNew}
            onChange={(e) => setPinNew(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            className="input-field-compact text-center tracking-[0.4em]"
            placeholder="PIN ni takrorlang"
            value={pinNew2}
            onChange={(e) => setPinNew2(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 font-medium text-sm"
            onClick={() => setFaceMode("enroll")}
          >
            <ScanFace className="w-4 h-4" />
            {pinFace ? "Yuz tayyor ✓ — qayta skanerlash" : "Yuzni skanerlash (tiklash uchun, tavsiya etiladi)"}
          </button>
          <p className="text-[11px] text-slate-400">
            Yuz skaneri ixtiyoriy, lekin uni qo‘shsangiz PINni unutib qolsangiz osongina tiklaysiz.
          </p>
          <button
            type="button"
            className="btn-primary btn-compact w-full"
            onClick={() => void enablePin()}
            disabled={pinBusy}
          >
            {pinBusy ? "..." : "PINni yoqish"}
          </button>
        </section>
      ) : (
        <>
          <section className="settings-security-card space-y-2.5">
            <p className="settings-section-label">Joriy PIN</p>
            <input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              className="input-field-compact text-center tracking-[0.4em]"
              placeholder="Joriy PIN"
              value={pinCurrent}
              onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm"
              onClick={() => setFaceMode("update")}
            >
              <ScanFace className="w-4 h-4" />
              {pinStatus.faceEnrolled ? "Yuzni yangilash" : "Yuz qo‘shish (tiklash uchun)"}
            </button>
          </section>

          <section className="settings-security-card space-y-2.5">
            <p className="settings-section-label">PINni o‘zgartirish</p>
            <input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              className="input-field-compact text-center tracking-[0.4em]"
              placeholder="Yangi PIN"
              value={pinNew}
              onChange={(e) => setPinNew(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              className="input-field-compact text-center tracking-[0.4em]"
              placeholder="Yangi PIN ni takrorlang"
              value={pinNew2}
              onChange={(e) => setPinNew2(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button
              type="button"
              className="btn-primary btn-compact w-full"
              onClick={() => void changePin()}
              disabled={pinBusy}
            >
              {pinBusy ? "..." : "PINni o‘zgartirish"}
            </button>
          </section>

          <section className="settings-security-card">
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-medium text-sm"
              onClick={() => void disablePin()}
              disabled={pinBusy}
            >
              Ilova qulfini o‘chirish
            </button>
            <p className="text-[11px] text-slate-400 mt-1.5">O‘chirish uchun yuqorida joriy PIN ni kiriting.</p>
          </section>
        </>
      )}
    </div>
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
    <>
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
          {section === "applock" && renderAppLock()}
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
    {faceMode && (
      <FaceCapture
        title={faceMode === "enroll" ? "Yuzni ro'yxatdan o'tkazish" : "Yuzni yangilash"}
        hint="Yuzingizni doira ichiga joylang. Bu rasm PINni tiklashda shaxsingizni tasdiqlash uchun ishlatiladi."
        confirmLabel={faceMode === "enroll" ? "Yuzni saqlash" : "Yangilash"}
        onCapture={handleFaceCaptured}
        onCancel={() => setFaceMode(null)}
      />
    )}
    </>
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
