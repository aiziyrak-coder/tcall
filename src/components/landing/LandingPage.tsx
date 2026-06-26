"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Download,
  MessageCircle,
  Phone,
  Shield,
  Smartphone,
  Monitor,
  Apple,
  ChevronRight,
  Languages,
  Zap,
  Lock,
  Video,
} from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  ANDROID_DOWNLOAD,
  APP_VERSION,
  LANDING_FEATURES,
  LANDING_FAQ,
  LANDING_STATS,
  LANDING_STEPS,
  PLATFORM_DOWNLOADS,
  type PlatformDownload,
} from "@/lib/platform-downloads";
import { GLOBAL_LANGUAGES_TAGLINE } from "@/lib/languages";

const FEATURE_ICONS = {
  languages: Languages,
  video: Video,
  chat: MessageCircle,
  shield: Shield,
} as const;

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

function AndroidHeroCard() {
  return (
    <a href={ANDROID_DOWNLOAD} className="landing-android-hero-card landing-reveal">
      <div className="landing-android-hero-glow" aria-hidden />
      <div className="landing-android-hero-icon">
        <Smartphone className="w-10 h-10" />
      </div>
      <div className="landing-android-hero-body">
        <p className="landing-android-hero-label">Android uchun tayyor</p>
        <p className="landing-android-hero-size">v{APP_VERSION} · ~7 MB</p>
      </div>
      <span className="landing-android-hero-cta">
        <Download className="w-5 h-5" />
        Yuklab olish
        <ChevronRight className="w-4 h-4" />
      </span>
    </a>
  );
}

function PlatformCard({ platform, featured }: { platform: PlatformDownload; featured?: boolean }) {
  if (!platform.available && !featured) {
    return (
      <article className="landing-platform-card landing-platform-soon landing-reveal">
        <div className="landing-platform-icon">
          <PlatformIcon id={platform.id} />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">{platform.name}</h3>
        <p className="text-sm text-slate-400 mt-1">Tez orada</p>
      </article>
    );
  }

  return (
    <article className={`landing-platform-card landing-reveal${featured ? " landing-platform-featured" : ""}`}>
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
      <p className="mt-4 text-xs text-slate-500 leading-relaxed">{platform.installHint}</p>
      <a href={platform.downloadPath} download className="landing-btn-download mt-6 w-full">
        <Download className="w-4 h-4" />
        Yuklab olish
      </a>
    </article>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll(".landing-reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("landing-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  const android = PLATFORM_DOWNLOADS.find((p) => p.id === "android")!;
  const comingSoon = PLATFORM_DOWNLOADS.filter((p) => !p.available);

  return (
    <div className="landing-root" ref={rootRef}>
      <div className="landing-bg-orbs" aria-hidden>
        <span className="landing-orb landing-orb-1" />
        <span className="landing-orb landing-orb-2" />
        <span className="landing-orb landing-orb-3" />
      </div>

      <LandingNav />

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow landing-reveal">
                <Zap className="w-4 h-4" />
                {GLOBAL_LANGUAGES_TAGLINE}
              </p>
              <h1 className="landing-hero-title landing-reveal landing-reveal-delay-1">
                Dunyo bilan <span className="landing-gradient-text">o&apos;z tilingizda</span> gaplashing
              </h1>
              <p className="landing-hero-subtitle landing-reveal landing-reveal-delay-2">
                Video qo&apos;ng&apos;iroq, zamonaviy chat va real-time AI tarjima — bitta ilovada.
                Raqam kerak emas, faqat 9 xonali Tcall ID.
              </p>

              <div className="landing-hero-actions landing-reveal landing-reveal-delay-3">
                <a href={ANDROID_DOWNLOAD} className="landing-btn-primary landing-btn-pulse">
                  <Download className="w-5 h-5" />
                  Android yuklab olish
                </a>
                <a href="#features" className="landing-btn-secondary">
                  Imkoniyatlarni ko&apos;rish
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </a>
              </div>

              <div className="landing-hero-trust landing-reveal landing-reveal-delay-4">
                <span><Lock className="w-3.5 h-3.5" /> Xavfsiz ulanish</span>
                <span><Languages className="w-3.5 h-3.5" /> 180+ til</span>
                <span><Phone className="w-3.5 h-3.5" /> HD qo&apos;ng&apos;iroq</span>
              </div>
            </div>

            <div className="landing-hero-visual landing-reveal landing-reveal-delay-2" aria-hidden>
              <div className="landing-hero-orbit">
                <div className="landing-hero-ring landing-hero-ring-1" />
                <div className="landing-hero-ring landing-hero-ring-2" />
                <div className="landing-hero-phone">
                  <div className="landing-hero-screen">
                    <div className="landing-mock-msg landing-mock-msg-1">
                      <span>Salom! 👋</span>
                    </div>
                    <div className="landing-mock-msg landing-mock-msg-2">
                      <span>Hello! Nice to meet you</span>
                      <small>avtomatik tarjima</small>
                    </div>
                    <div className="landing-mock-call">
                      <Phone className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="landing-float-badge landing-float-1">
                  <Languages className="w-4 h-4 text-brand-600" />
                  <span>Tarjima</span>
                </div>
                <div className="landing-float-badge landing-float-2">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span>Video</span>
                </div>
                <div className="landing-float-badge landing-float-3">
                  <MessageCircle className="w-4 h-4 text-violet-600" />
                  <span>Chat</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats-bar">
          <div className="landing-container landing-stats-grid">
            {LANDING_STATS.map((s, i) => (
              <div key={s.label} className={`landing-stat landing-reveal landing-reveal-delay-${i + 1}`}>
                <span className="landing-stat-value">{s.value}</span>
                <span className="landing-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head landing-reveal">
              <h2 className="landing-section-title">Nega aynan Tcall?</h2>
              <p className="landing-section-desc">
                Telegram, WhatsApp va Zoom bir joyda — lekin til chegarasisiz.
              </p>
            </div>
            <div className="landing-features-grid">
              {LANDING_FEATURES.map((f, i) => {
                const Icon = FEATURE_ICONS[f.icon];
                return (
                  <article
                    key={f.title}
                    className={`landing-feature-card landing-reveal landing-reveal-delay-${(i % 4) + 1}`}
                  >
                    <div className="landing-feature-icon">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-4">{f.title}</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-head landing-reveal">
              <h2 className="landing-section-title">3 qadam — tayyor</h2>
            </div>
            <div className="landing-steps-grid">
              {LANDING_STEPS.map((s, i) => (
                <article
                  key={s.step}
                  className={`landing-step-card landing-reveal landing-reveal-delay-${i + 1}`}
                >
                  <span className="landing-step-num">{s.step}</span>
                  <h3 className="font-semibold text-slate-900 mt-4">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="download" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head landing-reveal">
              <h2 className="landing-section-title">Hoziroq boshlang</h2>
              <p className="landing-section-desc">
                Android ilovasini yuklab oling — bir necha soniyada o&apos;rnatiladi.
              </p>
            </div>

            <AndroidHeroCard />

            <div className="landing-platforms-compact landing-reveal">
              <PlatformCard platform={android} featured />
              {comingSoon.map((p) => (
                <PlatformCard key={p.id} platform={p} />
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section landing-section-alt">
          <div className="landing-container landing-faq-wrap">
            <div className="landing-section-head landing-reveal">
              <h2 className="landing-section-title">Savollar</h2>
            </div>
            <div className="landing-faq-list">
              {LANDING_FAQ.map((item, i) => (
                <details key={item.q} className={`landing-faq-item landing-reveal landing-reveal-delay-${i + 1}`}>
                  <summary>
                    {item.q}
                    <ChevronRight className="landing-faq-chevron w-5 h-5" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-container text-center landing-reveal">
            <TcallLogo size="md" layout="horizontal" className="mx-auto landing-cta-logo" />
            <h2 className="mt-6 text-2xl sm:text-4xl font-bold text-white">
              Bugun dunyo bilan bog&apos;laning
            </h2>
            <p className="mt-3 text-indigo-100 max-w-lg mx-auto text-lg">
              Bepul yuklab oling. Til endi to&apos;siq emas.
            </p>
            <a href={ANDROID_DOWNLOAD} className="landing-btn-white landing-btn-pulse mt-8">
              <Download className="w-5 h-5" />
              Android yuklab olish
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <TcallLogo size="xs" variant="icon" />
          <div className="landing-footer-links">
            <Link href="/privacy">Maxfiylik</Link>
            <Link href="/terms">Shartlar</Link>
            <a href="mailto:support@tcall.uz">support@tcall.uz</a>
          </div>
          <p className="landing-footer-copy">© {new Date().getFullYear()} Tcall · v{APP_VERSION}</p>
        </div>
      </footer>
    </div>
  );
}
