"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Globe, Phone, Shield, Sparkles } from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";

const SLIDES = [
  {
    icon: Sparkles,
    title: "Tcall ga xush kelibsiz",
    desc: "Dunyo bilan o'z tilingizda gaplashing. 9 xonali raqamingiz bilan audio qo'ng'iroq qiling.",
    gradient: "from-brand-500/20 via-purple-500/10 to-transparent",
  },
  {
    icon: Globe,
    title: "Real-time tarjima",
    desc: "15+ til. Sherik boshqa tilde gapirsa ham, aqlli tarjima qiladi va ovozli eshitasiz.",
    gradient: "from-emerald-500/15 via-brand-500/10 to-transparent",
  },
  {
    icon: Phone,
    title: "Telefon kabi qo'ng'iroq",
    desc: "Yuqori sifatli audio, tez ulanish va kiruvchi qo'ng'iroq bildirishnomalari.",
    gradient: "from-blue-500/15 via-indigo-500/10 to-transparent",
  },
  {
    icon: Shield,
    title: "Xavfsiz va shaxsiy",
    desc: "Shifrlangan audio, shaxsiy profil va do'stlar bilan xavfsiz muloqot.",
    gradient: "from-violet-500/15 via-brand-500/10 to-transparent",
  },
];

interface NativeOnboardingProps {
  onComplete: () => void;
}

export function NativeOnboarding({ onComplete }: NativeOnboardingProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  }, [isLast, onComplete]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  return (
    <div className="native-onboarding">
      <div className={`native-onboarding-bg bg-gradient-to-b ${slide.gradient}`} />

      <div className="native-onboarding-top">
        {!isLast && (
          <button type="button" className="native-onboarding-skip" onClick={onComplete}>
            O&apos;tish
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

        <div className="native-onboarding-icon-wrap">
          <Icon className="w-10 h-10 text-brand-600" strokeWidth={1.8} />
        </div>

        <h1 className="native-onboarding-title">{slide.title}</h1>
        <p className="native-onboarding-desc">{slide.desc}</p>
      </div>

      <div className="native-onboarding-footer">
        <div className="native-onboarding-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}-sahifa`}
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
            {isLast ? "Boshlash" : "Keyingi"}
            {!isLast && <ChevronRight className="w-5 h-5 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}
