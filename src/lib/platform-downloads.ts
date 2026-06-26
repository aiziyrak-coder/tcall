import { getLandingUrl } from "@/lib/domains";
import { GLOBAL_LANGUAGES_TAGLINE } from "@/lib/languages";

export type PlatformId = "android" | "ios" | "windows" | "linux";

export interface PlatformDownload {
  id: PlatformId;
  name: string;
  subtitle: string;
  minOs: string;
  fileLabel: string;
  downloadPath: string;
  available: boolean;
  installHint: string;
  requirements: string[];
}

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.000000";
const base = getLandingUrl();

export const APP_VERSION = VERSION;

export const ANDROID_DOWNLOAD = `${base}/downloads/tcall-android.apk?v=${VERSION}`;

export const PLATFORM_DOWNLOADS: PlatformDownload[] = [
  {
    id: "android",
    name: "Android",
    subtitle: "Telefon va planshet",
    minOs: "Android 8.0+",
    fileLabel: "APK",
    downloadPath: ANDROID_DOWNLOAD,
    available: true,
    installHint: "Yuklab oling → «Nomaʼlum manbalar» ruxsatini yoqing → o‘rnating.",
    requirements: ["Kamera va mikrofon", "Internet"],
  },
  {
    id: "ios",
    name: "iPhone / iPad",
    subtitle: "iOS qurilmalar",
    minOs: "iOS 16.0+",
    fileLabel: "App Store",
    downloadPath: "https://apps.apple.com/app/tcall",
    available: false,
    installHint: "App Store versiyasi tez orada.",
    requirements: ["Kamera va mikrofon", "Internet"],
  },
  {
    id: "windows",
    name: "Windows",
    subtitle: "Kompyuter",
    minOs: "Windows 10 / 11",
    fileLabel: "Installer",
    downloadPath: `${base}/downloads/tcall-windows-setup.exe`,
    available: false,
    installHint: "Tez orada chiqadi.",
    requirements: ["Kamera va mikrofon", "Internet"],
  },
  {
    id: "linux",
    name: "Linux",
    subtitle: "Ubuntu va boshqalar",
    minOs: "Ubuntu 22.04+",
    fileLabel: "AppImage",
    downloadPath: `${base}/downloads/tcall-linux-x64.AppImage`,
    available: false,
    installHint: "Tez orada chiqadi.",
    requirements: ["x86_64", "Internet"],
  },
];

export const LANDING_FEATURES = [
  {
    icon: "languages" as const,
    title: "Har qanday tilda gapiring",
    description: `${GLOBAL_LANGUAGES_TAGLINE}. Siz o'z tilingizda yozasiz — sherigingiz o'zida o'qiydi.`,
  },
  {
    icon: "video" as const,
    title: "Video va audio qo'ng'iroq",
    description: "Yuqori sifat, past kechikish. Dunyo bilan bevosita bog'laning.",
  },
  {
    icon: "chat" as const,
    title: "Zamonaviy chat",
    description: "Guruhlar, pin, javob, reaksiya, ovozli xabar — hammasi bir joyda.",
  },
  {
    icon: "shield" as const,
    title: "Xavfsiz va maxfiy",
    description: "Shifrlangan ulanish. Suhbatlaringiz sizniki — hech kimga sotilmaydi.",
  },
] as const;

export const LANDING_STEPS = [
  {
    step: "1",
    title: "Yuklab oling",
    description: "Android APK ni bir bosishda o'rnating.",
  },
  {
    step: "2",
    title: "Ro'yxatdan o'ting",
    description: "Tilni tanlang, 9 xonali Tcall ID oling.",
  },
  {
    step: "3",
    title: "Dunyo bilan gaplashing",
    description: "Chat, qo'ng'iroq yoki video — tarjima avtomatik.",
  },
] as const;

export const LANDING_STATS = [
  { value: "180+", label: "Tillar" },
  { value: "HD", label: "Video qo'ng'iroq" },
  { value: "0₽", label: "Boshlash bepul" },
  { value: "24/7", label: "Ishlaydi" },
] as const;

export const LANDING_FAQ = [
  {
    q: "Ilovani qanday o'rnataman?",
    a: "Android uchun «Yuklab olish» tugmasini bosing. Sozlamalarda «Noma'lum manbalardan o'rnatish» ni yoqing va APK ni oching.",
  },
  {
    q: "Tarjima qanday ishlaydi?",
    a: "Xabar yoki nutq avtomatik tanlanadi va sherigingiz tiliga tarjima qilinadi. Qo'ng'iroqda ham subtitr ko'rasiz.",
  },
  {
    q: "Bepulmi?",
    a: "Ro'yxatdan o'tish va asosiy funksiyalar bepul. Premium imkoniyatlar ixtiyoriy.",
  },
] as const;
