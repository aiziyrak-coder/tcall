import Link from "next/link";
import {
  Download,
  Globe,
  MessageCircle,
  Phone,
  Shield,
  Smartphone,
  Monitor,
  Apple,
  ChevronRight,
  Languages,
  Users,
  Zap,
  Lock,
  Check,
  Minus,
} from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";
import { LandingNav } from "@/components/landing/LandingNav";
import { getWebAppUrl } from "@/lib/domains";
import {
  APP_VERSION,
  LANDING_FEATURES,
  LANDING_FAQ,
  LANDING_STATS,
  LANDING_STEPS,
  PLATFORM_DOWNLOADS,
  SUPPORTED_LANGUAGES,
  WEB_VS_NATIVE,
  type PlatformDownload,
} from "@/lib/platform-downloads";
import { GLOBAL_LANGUAGES_TAGLINE, LANGUAGES } from "@/lib/languages";

function PlatformIcon({ id }: { id: PlatformDownload["id"] }) {
  const cls = "w-7 h-7";
  switch (id) {
    case "android":
      return <Smartphone className={cls} />;
    case "ios":
      return <Apple className={cls} />;
    case "windows":
    case "linux":
      return <Monitor className={cls} />;
  }
}

function PlatformCard({ platform }: { platform: PlatformDownload }) {
  const isExternal = platform.downloadPath.startsWith("http");

  return (
    <article className="landing-platform-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="landing-platform-icon">
          <PlatformIcon id={platform.id} />
        </div>
        <span className="landing-version-badge">v{APP_VERSION}</span>
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-semibold text-slate-900">{platform.name}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{platform.subtitle}</p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-slate-400">Tizim</dt>
          <dd className="text-slate-700 font-medium">{platform.minOs}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Format</dt>
          <dd className="text-slate-700 font-medium">{platform.fileLabel}</dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-1.5">
        {platform.requirements.map((req) => (
          <li key={req} className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
            {req}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">{platform.installHint}</p>

      {platform.available ? (
        <a href={platform.downloadPath} download className="landing-btn-download mt-6 w-full">
          <Download className="w-4 h-4" />
          Yuklab olish
        </a>
      ) : (
        <div className="mt-6 w-full landing-btn-soon" aria-disabled>
          Tez orada chiqadi
        </div>
      )}

      {isExternal && platform.available && (
        <p className="mt-2 text-[11px] text-center text-slate-400">Tashqi havola</p>
      )}
    </article>
  );
}

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-emerald-600 mx-auto" aria-label="Bor" />;
  }
  if (value === false) {
    return <Minus className="w-5 h-5 text-slate-300 mx-auto" aria-label="Yo‘q" />;
  }
  return <span className="text-xs text-slate-600 font-medium">{value}</span>;
}

export function LandingPage() {
  const webAppUrl = getWebAppUrl();
  const webLoginUrl = `${webAppUrl.replace(/\/$/, "")}/login`;

  return (
    <div className="landing-root">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <Languages className="w-4 h-4" />
                Til chegarasisiz global platforma
              </p>
              <h1 className="landing-hero-title">Dunyo bilan o&apos;z tilingizda gaplashing</h1>
              <p className="landing-hero-subtitle">
                Tcall — real-time AI tarjima, video qo&apos;ng&apos;iroq va xavfsiz chat.
                Har bir qurilma uchun alohida <strong>native</strong> ilova. WebView emas.
              </p>

              <div className="landing-hero-actions">
                <a href="#download" className="landing-btn-primary">
                  <Download className="w-5 h-5" />
                  Ilovani yuklab olish
                </a>
                <a href={webAppUrl} className="landing-btn-secondary">
                  <Globe className="w-5 h-5" />
                  web.tcall.uz
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </a>
              </div>

              <p className="landing-hero-note">
                <strong className="text-slate-700">Muhim:</strong> Kirish va ilovadan foydalanish faqat{" "}
                <a href={webAppUrl} className="landing-link">
                  web.tcall.uz
                </a>{" "}
                da. Bu sahifa — ma&apos;lumot va yuklab olish uchun.
              </p>
            </div>

            <div className="landing-hero-visual" aria-hidden>
              <div className="landing-hero-orbit">
                <div className="landing-hero-phone">
                  <div className="landing-hero-screen">
                    <Phone className="w-8 h-8 text-white/90" />
                    <span className="text-white/80 text-sm font-medium mt-2">Qo&apos;ng&apos;iroq</span>
                  </div>
                </div>
                <div className="landing-float-badge landing-float-1">
                  <Languages className="w-4 h-4 text-brand-600" />
                  <span>{GLOBAL_LANGUAGES_TAGLINE}</span>
                </div>
                <div className="landing-float-badge landing-float-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Xavfsiz</span>
                </div>
                <div className="landing-float-badge landing-float-3">
                  <MessageCircle className="w-4 h-4 text-violet-600" />
                  <span>Chat</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="landing-stats-bar">
          <div className="landing-container landing-stats-grid">
            {LANDING_STATS.map((s) => (
              <div key={s.label} className="landing-stat">
                <span className="landing-stat-value">{s.value}</span>
                <span className="landing-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Web CTA — prominent */}
        <section className="landing-web-banner">
          <div className="landing-container landing-web-banner-inner">
            <div className="landing-web-banner-icon">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Ilovadan foydalanish</h2>
              <p className="text-sm text-slate-600 mt-1">
                Kirish, chat, qo&apos;ng&apos;iroq va barcha funksiyalar{" "}
                <strong className="text-slate-800 font-mono">web.tcall.uz</strong> da.
                tcall.uz faqat yuklab olish sahifasi.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <a href={webAppUrl} className="landing-btn-primary">
                web.tcall.uz ga kirish
              </a>
              <a href={webLoginUrl} className="landing-btn-secondary text-sm py-3">
                Ro&apos;yxatdan o&apos;tish / Kirish
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Nima uchun Tcall?</h2>
              <p className="landing-section-desc">
                Halqaro muloqot uchun barcha kerakli vositalar — bitta platformada.
              </p>
            </div>
            <div className="landing-features-grid">
              {LANDING_FEATURES.map((f) => (
                <article key={f.title} className="landing-feature-card">
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Qanday ishlaydi?</h2>
              <p className="landing-section-desc">Uch qadamda dunyo bilan bog&apos;laning.</p>
            </div>
            <div className="landing-steps-grid">
              {LANDING_STEPS.map((s) => (
                <article key={s.step} className="landing-step-card">
                  <span className="landing-step-num">{s.step}</span>
                  <h3 className="font-semibold text-slate-900 mt-4">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Languages */}
        <section className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Qo&apos;llab-quvvatlanadigan tillar</h2>
              <p className="landing-section-desc">{GLOBAL_LANGUAGES_TAGLINE} — {LANGUAGES.length} ta til va undan ham ko&apos;p.</p>
            </div>
            <div className="landing-lang-grid">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <span key={lang} className="landing-lang-chip">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Downloads */}
        <section id="download" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Qurilmangiz uchun yuklab oling</h2>
              <p className="landing-section-desc">
                Har bir platforma uchun alohida native ilova. Versiya{" "}
                <span className="font-mono font-semibold text-brand-700">{APP_VERSION}</span>
              </p>
            </div>

            <div className="landing-platforms-grid">
              {PLATFORM_DOWNLOADS.map((p) => (
                <PlatformCard key={p.id} platform={p} />
              ))}
            </div>

            <div className="landing-install-tips mt-10">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-600" />
                O&apos;rnatish bo&apos;yicha maslahatlar
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Android:</strong> APK yuklab oling → Sozlamalar → Xavfsizlik → Noma&apos;lum manbalardan
                  o&apos;rnatishni yoqing.
                </li>
                <li>
                  <strong>Windows / Linux:</strong> Tez orada — bu sahifadan yuklab olish mumkin bo&apos;ladi.
                </li>
                <li>
                  <strong>iOS:</strong> App Store versiyasi tayyorlanmoqda. Hozircha{" "}
                  <a href={webAppUrl} className="landing-link">
                    web.tcall.uz
                  </a>{" "}
                  dan foydalaning.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Web vs Native */}
        <section className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Web yoki native?</h2>
              <p className="landing-section-desc">Ikkala variant ham to&apos;liq funksional.</p>
            </div>
            <div className="landing-compare-wrap">
              <table className="landing-compare-table">
                <thead>
                  <tr>
                    <th>Imkoniyat</th>
                    <th>
                      <Globe className="w-4 h-4 inline mr-1" />
                      Web
                    </th>
                    <th>
                      <Smartphone className="w-4 h-4 inline mr-1" />
                      Native
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {WEB_VS_NATIVE.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>
                        <CompareCell value={row.web} />
                      </td>
                      <td>
                        <CompareCell value={row.native} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container landing-security-grid">
            <div>
              <h2 className="landing-section-title">Xavfsizlik va maxfiylik</h2>
              <p className="landing-section-desc text-left mt-3 max-w-none">
                Ma&apos;lumotlaringiz himoyalangan. Biz sizning suhbatlaringizni sotmaymiz.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: Lock, text: "JWT autentifikatsiya va xavfsiz sessiyalar" },
                  { icon: Shield, text: "Shifrlangan ulanishlar (HTTPS / WSS)" },
                  { icon: Users, text: "Shaxsiy ma'lumotlarni uchinchi shaxslarga bermaymiz" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                    <Icon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
              <Link href="/privacy" className="landing-link inline-block mt-6 text-sm">
                Maxfiylik siyosati →
              </Link>
            </div>
            <div className="landing-security-card">
              <Shield className="w-12 h-12 text-brand-600" />
              <p className="mt-4 text-slate-700 leading-relaxed">
                Tcall xalqaro standartlarga mos ravishda ishlab chiqilgan. Savollar bo&apos;lsa{" "}
                <a href="mailto:support@tcall.uz" className="landing-link">
                  support@tcall.uz
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="landing-section">
          <div className="landing-container landing-faq-wrap">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Tez-tez so&apos;raladigan savollar</h2>
            </div>
            <div className="landing-faq-list">
              {LANDING_FAQ.map((item) => (
                <details key={item.q} className="landing-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="landing-final-cta">
          <div className="landing-container text-center">
            <TcallLogo size="md" layout="horizontal" className="mx-auto" />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-white">Boshlashga tayyormisiz?</h2>
            <p className="mt-3 text-indigo-100 max-w-xl mx-auto">
              Native ilovani yuklab oling yoki brauzerda darhol ishga tushiring.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#download" className="landing-btn-white">
                <Download className="w-5 h-5" />
                Yuklab olish
              </a>
              <a href={webAppUrl} className="landing-btn-outline-white">
                <Globe className="w-5 h-5" />
                web.tcall.uz
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <TcallLogo size="xs" variant="icon" />
          <div className="landing-footer-links">
            <Link href="/privacy">Maxfiylik</Link>
            <Link href="/terms">Foydalanish shartlari</Link>
            <a href="mailto:support@tcall.uz">support@tcall.uz</a>
            <a href={webAppUrl}>web.tcall.uz — ilova</a>
          </div>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} Tcall · v{APP_VERSION} · tcall.uz — landing sahifa
          </p>
        </div>
      </footer>
    </div>
  );
}
