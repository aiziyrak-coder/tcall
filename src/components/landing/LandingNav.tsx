"use client";

import { useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";
import { getWebAppUrl } from "@/lib/domains";

const NAV = [
  { href: "#features", label: "Imkoniyatlar" },
  { href: "#how", label: "Qanday ishlaydi" },
  { href: "#download", label: "Yuklab olish" },
  { href: "#faq", label: "Savollar" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const webAppUrl = getWebAppUrl();

  return (
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <TcallLogo size="sm" layout="horizontal" variant="full" />

        <nav className="landing-nav" aria-label="Asosiy">
          {NAV.map(({ href, label }) => (
            <a key={href} href={href} className="landing-nav-link">
              {label}
            </a>
          ))}
          <a href={webAppUrl} className="landing-btn-primary-sm">
            <Globe className="w-4 h-4" />
            web.tcall.uz
          </a>
        </nav>

        <button
          type="button"
          className="landing-mobile-menu-btn sm:hidden"
          aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="landing-mobile-nav sm:hidden">
          <div className="landing-container py-4 flex flex-col gap-3">
            {NAV.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="landing-mobile-nav-link"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <a href={webAppUrl} className="landing-btn-primary w-full mt-2" onClick={() => setOpen(false)}>
              <Globe className="w-5 h-5" />
              Web ilovaga kirish
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
