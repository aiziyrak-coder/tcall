import { getLandingUrl } from "@/lib/domains";

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

export const PLATFORM_DOWNLOADS: PlatformDownload[] = [
  {
    id: "android",
    name: "Android",
    subtitle: "Telefon va planshet",
    minOs: "Android 8.0 (Oreo) yoki yangiroq",
    fileLabel: "APK",
    downloadPath: `${base}/downloads/tcall-android.apk`,
    available: true,
    installHint: "APK yuklab oling → «Nomaʼlum manbalar» ruxsatini yoqing → o‘rnating.",
    requirements: ["ARM64 yoki ARMv7", "Kamera va mikrofon", "Internet"],
  },
  {
    id: "ios",
    name: "iPhone / iPad",
    subtitle: "iOS qurilmalar",
    minOs: "iOS 16.0 yoki yangiroq",
    fileLabel: "App Store",
    downloadPath: "https://apps.apple.com/app/tcall",
    available: false,
    installHint: "App Store orqali o‘rnatish tez orada. Hozircha TestFlight taklifnomasi kerak.",
    requirements: ["iPhone 8 va yangiroq", "Kamera va mikrofon", "Internet"],
  },
  {
    id: "windows",
    name: "Windows",
    subtitle: "Kompyuter va noutbuk",
    minOs: "Windows 10 / 11 (64-bit)",
    fileLabel: "Installer",
    downloadPath: `${base}/downloads/tcall-windows-setup.exe`,
    available: false,
    installHint: "O‘rnatuvchini yuklab oling va ishga tushiring. SmartScreen ogohlantirishi chiqsa «Batafsil» → «Baribir ishga tushirish».",
    requirements: [".NET 8 Runtime (o‘rnatuvchi bilan keladi)", "Kamera va mikrofon", "Internet"],
  },
  {
    id: "linux",
    name: "Linux",
    subtitle: "Ubuntu, Debian, Kali va boshqalar",
    minOs: "Ubuntu 22.04+ yoki ekvivalent",
    fileLabel: "AppImage",
    downloadPath: `${base}/downloads/tcall-linux-x64.AppImage`,
    available: false,
    installHint: "AppImage faylini yuklab oling → `chmod +x` → ikki marta bosing yoki terminaldan ishga tushiring.",
    requirements: ["x86_64 (64-bit)", "libfuse2 (Ubuntu: sudo apt install libfuse2)", "Internet"],
  },
];

export const LANDING_FEATURES = [
  {
    title: "Real-time tarjima",
    description: "15+ til. Gapiring — sherigingiz o‘z tilida subtitr va tarjima ko‘radi.",
  },
  {
    title: "Video va audio qo‘ng‘iroq",
    description: "WebRTC — yuqori sifat, past kechikish. Dunyo bilan bevosita bog‘laning.",
  },
  {
    title: "Xavfsiz chat",
    description: "Shaxsiy va guruh suhbatlari, media, ovozli xabarlar.",
  },
  {
    title: "Har qurilmada native",
    description: "Android, iOS, Windows, Linux — WebView emas, haqiqiy ilovalar.",
  },
  {
    title: "9 xonali Tcall ID",
    description: "Telefon raqamisiz — do‘stingizga ID yuboring va darhol bog‘laning.",
  },
  {
    title: "Jonli tarjimon",
    description: "Mikrofon orqali nutqni taniydi va boshqa tilga tarjima qiladi.",
  },
];

export const LANDING_STEPS = [
  {
    step: "1",
    title: "Ro‘yxatdan o‘ting",
    description: "web.tcall.uz da hisob yarating yoki native ilovadan kirish. Til va profilni sozlang.",
  },
  {
    step: "2",
    title: "Do‘st qo‘shing yoki raqam tering",
    description: "9 xonali Tcall ID orqali qidiruv, do‘stlar ro‘yxati yoki xona kodi bilan ulanish.",
  },
  {
    step: "3",
    title: "Gapiring va qo‘ng‘iroq qiling",
    description: "Chat, audio qo‘ng‘iroq yoki video — AI tarjima avtomatik ishlaydi.",
  },
] as const;

export const LANDING_STATS = [
  { value: "15+", label: "Tillar" },
  { value: "4", label: "Platforma" },
  { value: "1 ID", label: "Butun dunyo" },
  { value: "WebView yo‘q", label: "Native ilova" },
] as const;

export const SUPPORTED_LANGUAGES = [
  "O‘zbek", "Rus", "Ingliz", "Turk", "Arab", "Nemis", "Fransuz",
  "Ispan", "Xitoy", "Koreys", "Hind", "Yapon", "Portugal", "Italiyan", "Polsha",
] as const;

export const LANDING_FAQ = [
  {
    q: "tcall.uz va web.tcall.uz farqi nima?",
    a: "tcall.uz — marketing va yuklab olish sahifasi. Kirish, chat va qo‘ng‘iroq uchun web.tcall.uz dan foydalaning.",
  },
  {
    q: "Ilovani qayerdan yuklab olaman?",
    a: "Android APK shu sahifadagi «Yuklab olish» bo‘limidan. iOS, Windows va Linux versiyalari tez orada qo‘shiladi.",
  },
  {
    q: "Brauzerda ishlatsam bo‘ladimi?",
    a: "Ha. To‘liq veb-ilova web.tcall.uz da — o‘rnatish shart emas, lekin PWA sifatida bosh ekranga qo‘shish mumkin.",
  },
  {
    q: "Tarjima qanday ishlaydi?",
    a: "Nutq yoki matn avtomatik tanlanadi, AI tarjima qiladi. Qo‘ng‘iroq paytida sherigingiz o‘z tilida subtitr ko‘radi.",
  },
  {
    q: "Xavfsizlik qanday ta’minlanadi?",
    a: "JWT sessiyalar, shifrlangan ulanishlar va maxfiylik siyosati. Ma’lumotlaringiz uchinchi shaxslarga sotilmaydi.",
  },
] as const;

export const WEB_VS_NATIVE = [
  { feature: "Chat va qo‘ng‘iroq", web: true, native: true },
  { feature: "Real-time tarjima", web: true, native: true },
  { feature: "O‘rnatish talab qilinmaydi", web: true, native: false },
  { feature: "Push (ilova yopiq)", web: "Cheklangan", native: true },
  { feature: "Eng yaxshi ishlash", web: false, native: true },
  { feature: "Kamera / mikrofon", web: true, native: true },
] as const;
