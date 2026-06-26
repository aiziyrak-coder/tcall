"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Phone,
  Shield,
  Sparkles,
  Mic,
  Bell,
  Camera,
  MapPin,
  Check,
  type LucideIcon,
} from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";
import { detectDeviceLanguage } from "@/lib/locale-detect";

type PermItem = { icon: LucideIcon; label: string; reason: string };

interface Content {
  skip: string;
  next: string;
  start: string;
  enableNotif: string;
  notifOn: string;
  slides: { icon: LucideIcon; title: string; desc: string; gradient: string }[];
  perms: { title: string; desc: string; items: PermItem[] };
}

const GRAD = [
  "from-brand-500/20 via-purple-500/10 to-transparent",
  "from-emerald-500/15 via-brand-500/10 to-transparent",
  "from-blue-500/15 via-indigo-500/10 to-transparent",
  "from-amber-500/15 via-brand-500/10 to-transparent",
  "from-violet-500/15 via-brand-500/10 to-transparent",
];

const CONTENT: Record<string, Content> = {
  uz: {
    skip: "O'tish",
    next: "Keyingi",
    start: "Boshlash",
    enableNotif: "Bildirishnomalarni yoqish",
    notifOn: "Bildirishnomalar yoqildi ✓",
    slides: [
      { icon: Sparkles, title: "Tcall ga xush kelibsiz", desc: "Dunyo bilan o'z tilingizda gaplashing. 9 xonali Tcall raqamingiz bilan audio qo'ng'iroq qiling.", gradient: GRAD[0] },
      { icon: Globe, title: "Real-time tarjima", desc: "Dunyodagi barcha tillar. Sherik boshqa tilda gapirsa ham, aqlli tarjima qiladi va siz o'z tilingizda eshitasiz.", gradient: GRAD[1] },
      { icon: Phone, title: "Qo'ng'iroq va xabar", desc: "Yuqori sifatli audio qo'ng'iroq va chat — hammasi avtomatik tarjima bilan.", gradient: GRAD[2] },
      { icon: Shield, title: "Xavfsiz va shaxsiy", desc: "PIN qulf, yuz orqali tiklash va himoyalangan muloqot.", gradient: GRAD[4] },
    ],
    perms: {
      title: "Ruxsatlar nima uchun kerak",
      desc: "Tcall to'liq ishlashi uchun quyidagilarga ruxsat berasiz. Har biri faqat kerak bo'lganda so'raladi:",
      items: [
        { icon: Mic, label: "Mikrofon", reason: "Qo'ng'iroq paytida ovozingizni uzatish uchun." },
        { icon: Bell, label: "Bildirishnoma", reason: "Qo'ng'iroq yoki xabarni o'tkazib yubormaslik uchun — ilova yopiq bo'lsa ham." },
        { icon: Camera, label: "Kamera", reason: "Profil rasmi va PIN'ni yuz orqali tiklash uchun." },
        { icon: MapPin, label: "Joylashuv", reason: "Do'stlaringizga joylashuvingizni yuborish uchun." },
      ],
    },
  },
  ru: {
    skip: "Пропустить",
    next: "Далее",
    start: "Начать",
    enableNotif: "Включить уведомления",
    notifOn: "Уведомления включены ✓",
    slides: [
      { icon: Sparkles, title: "Добро пожаловать в Tcall", desc: "Общайтесь с миром на своём языке. Звоните по вашему 9-значному Tcall ID.", gradient: GRAD[0] },
      { icon: Globe, title: "Перевод в реальном времени", desc: "Все языки мира. Собеседник говорит на своём языке — вы слышите на своём.", gradient: GRAD[1] },
      { icon: Phone, title: "Звонки и сообщения", desc: "Качественные аудиозвонки и чат — всё с автоматическим переводом.", gradient: GRAD[2] },
      { icon: Shield, title: "Безопасно и приватно", desc: "PIN-замок, восстановление по лицу и защищённое общение.", gradient: GRAD[4] },
    ],
    perms: {
      title: "Зачем нужны разрешения",
      desc: "Для полноценной работы Tcall запросит доступ. Каждое — только когда нужно:",
      items: [
        { icon: Mic, label: "Микрофон", reason: "Чтобы передавать ваш голос во время звонка." },
        { icon: Bell, label: "Уведомления", reason: "Чтобы не пропустить звонок или сообщение — даже если приложение закрыто." },
        { icon: Camera, label: "Камера", reason: "Для фото профиля и восстановления PIN по лицу." },
        { icon: MapPin, label: "Геолокация", reason: "Чтобы отправлять вашу локацию друзьям." },
      ],
    },
  },
  en: {
    skip: "Skip",
    next: "Next",
    start: "Get started",
    enableNotif: "Enable notifications",
    notifOn: "Notifications enabled ✓",
    slides: [
      { icon: Sparkles, title: "Welcome to Tcall", desc: "Talk to the world in your own language. Make audio calls with your 9-digit Tcall ID.", gradient: GRAD[0] },
      { icon: Globe, title: "Real-time translation", desc: "All languages worldwide. They speak their language — you hear yours, instantly.", gradient: GRAD[1] },
      { icon: Phone, title: "Calls & messaging", desc: "High-quality audio calls and chat — all with automatic translation.", gradient: GRAD[2] },
      { icon: Shield, title: "Secure & private", desc: "PIN lock, face recovery and protected conversations.", gradient: GRAD[4] },
    ],
    perms: {
      title: "Why permissions are needed",
      desc: "Tcall asks for these so everything works. Each is requested only when needed:",
      items: [
        { icon: Mic, label: "Microphone", reason: "To send your voice during a call." },
        { icon: Bell, label: "Notifications", reason: "So you never miss a call or message — even when the app is closed." },
        { icon: Camera, label: "Camera", reason: "For your profile photo and face-based PIN recovery." },
        { icon: MapPin, label: "Location", reason: "To share your location with friends." },
      ],
    },
  },
};

interface NativeOnboardingProps {
  onComplete: () => void;
}

export function NativeOnboarding({ onComplete }: NativeOnboardingProps) {
  const t = useMemo(() => {
    const lang = detectDeviceLanguage("en");
    return CONTENT[lang] || CONTENT.en;
  }, []);

  // slides + a dedicated permissions slide at the end (before finishing)
  const total = t.slides.length + 1;
  const [index, setIndex] = useState(0);
  const [notifAsked, setNotifAsked] = useState(false);
  const touchStartX = useRef(0);
  const isPermsSlide = index === t.slides.length;
  const isLast = index === total - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onComplete, total]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const enableNotifications = useCallback(async () => {
    setNotifAsked(true);
    try {
      const { ensureNativeNotificationPermission } = await import("@/lib/native-permissions");
      const { isNativeApp } = await import("@/lib/native-app");
      if (isNativeApp()) {
        await ensureNativeNotificationPermission();
      } else if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const { ensureWebPushSubscription } = await import("@/lib/web-push-client");
      void ensureWebPushSubscription({ requestPermission: false });
    } catch {
      /* best effort */
    }
  }, []);

  const enableMicrophone = useCallback(async () => {
    try {
      const { ensureNativeMicPermission } = await import("@/lib/native-permissions");
      await ensureNativeMicPermission();
    } catch {
      /* best effort */
    }
  }, []);

  const slide = isPermsSlide ? null : t.slides[index];
  const Icon = slide?.icon;
  const gradient = isPermsSlide ? GRAD[3] : slide!.gradient;

  return (
    <div className="native-onboarding">
      <div className={`native-onboarding-bg bg-gradient-to-b ${gradient}`} />

      <div className="native-onboarding-top">
        {!isLast && (
          <button type="button" className="native-onboarding-skip" onClick={onComplete}>
            {t.skip}
          </button>
        )}
      </div>

      <div
        className="native-onboarding-body"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(e) => {
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (dx < -50) goNext();
          else if (dx > 50) goPrev();
        }}
      >
        <div className="native-onboarding-logo">
          <TcallLogo size="md" variant="icon" />
        </div>

        {isPermsSlide ? (
          <div className="w-full max-w-sm">
            <h1 className="native-onboarding-title">{t.perms.title}</h1>
            <p className="native-onboarding-desc mb-4">{t.perms.desc}</p>
            <div className="space-y-3 text-left">
              {t.perms.items.map((it) => {
                const ItemIcon = it.icon;
                return (
                  <div key={it.label} className="flex items-start gap-3">
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
                      <ItemIcon className="w-[18px] h-[18px] text-brand-600" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px]">{it.label}</p>
                      <p className="text-slate-500 text-[12.5px] leading-snug">{it.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void enableMicrophone()}
              className="mt-4 w-full py-3 rounded-2xl bg-slate-100 text-slate-800 font-semibold text-[15px] flex items-center justify-center gap-2 border border-slate-200"
            >
              <Mic className="w-4 h-4" /> {t.perms.items[0]?.label || "Mikrofon"}
            </button>
            <button
              type="button"
              onClick={() => void enableNotifications()}
              disabled={notifAsked}
              className="mt-3 w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {notifAsked ? <><Check className="w-4 h-4" /> {t.notifOn}</> : <><Bell className="w-4 h-4" /> {t.enableNotif}</>}
            </button>
          </div>
        ) : (
          <>
            <div className="native-onboarding-icon-wrap">
              {Icon && <Icon className="w-10 h-10 text-brand-600" strokeWidth={1.8} />}
            </div>
            <h1 className="native-onboarding-title">{slide!.title}</h1>
            <p className="native-onboarding-desc">{slide!.desc}</p>
          </>
        )}
      </div>

      <div className="native-onboarding-footer">
        <div className="native-onboarding-dots">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}`}
              className={`native-onboarding-dot${i === index ? " native-onboarding-dot-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className="native-onboarding-actions">
          {index > 0 && (
            <button type="button" className="native-onboarding-nav" onClick={goPrev}>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button type="button" className="btn-primary native-onboarding-start" onClick={goNext}>
            {isLast ? t.start : t.next}
            {!isLast && <ChevronRight className="w-5 h-5 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}
