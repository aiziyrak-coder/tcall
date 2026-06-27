"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Compass } from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import { isNativeApp } from "@/lib/native-app";
import {
  dismissInstallPrompt,
  dismissIOSInstallPrompt,
  shouldShowIOSChromeHint,
  shouldShowIOSInstallGuide,
  wasInstallDismissed,
} from "@/lib/pwa-install";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({ userLanguage }: { userLanguage?: string }) {
  const ui = useUI(userLanguage || "uz");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showIOSChrome, setShowIOSChrome] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isNativeApp()) return;

    setDismissed(wasInstallDismissed());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (shouldShowIOSInstallGuide()) {
      setShowIOSGuide(true);
      setDismissed(false);
    } else if (shouldShowIOSChromeHint()) {
      setShowIOSChrome(true);
      setDismissed(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const closeAll = () => {
    dismissInstallPrompt();
    dismissIOSInstallPrompt();
    setDismissed(true);
    setDeferred(null);
    setShowIOSGuide(false);
    setShowIOSChrome(false);
  };

  if (dismissed) return null;

  if (showIOSChrome) {
    return (
      <div className="install-prompt install-prompt-ios" role="dialog" aria-label={ui.installIOSChromeHint}>
        <div className="install-prompt-body install-prompt-body-stack">
          <div className="install-prompt-ios-head">
            <Compass className="w-5 h-5 text-brand-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">{ui.installIOSChromeTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ui.installIOSChromeHint}</p>
            </div>
            <button type="button" className="ios-icon-btn shrink-0" aria-label={ui.close} onClick={closeAll}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="install-ios-steps">
            <li>{ui.installIOSChromeStep1}</li>
            <li>{ui.installIOSChromeStep2}</li>
          </ol>
        </div>
      </div>
    );
  }

  if (showIOSGuide) {
    return (
      <div className="install-prompt install-prompt-ios" role="dialog" aria-label={ui.installIOSTitle}>
        <div className="install-prompt-body install-prompt-body-stack">
          <div className="install-prompt-ios-head">
            <Share className="w-5 h-5 text-brand-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">{ui.installIOSTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ui.installAppHint}</p>
            </div>
            <button type="button" className="ios-icon-btn shrink-0" aria-label={ui.close} onClick={closeAll}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="install-ios-steps">
            <li>{ui.installIOSStep1}</li>
            <li>{ui.installIOSStep2}</li>
          </ol>
          <p className="install-ios-note">{ui.installIOSNote}</p>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label={ui.installApp}>
      <div className="install-prompt-body">
        <Download className="w-5 h-5 text-brand-600 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-sm">{ui.installApp}</p>
          <p className="text-xs text-slate-500">{ui.installAppHint}</p>
        </div>
        <button
          type="button"
          className="btn-primary btn-compact text-xs shrink-0"
          onClick={() =>
            void deferred.prompt().then(() => {
              setDeferred(null);
              closeAll();
            })
          }
        >
          {ui.installAppAction}
        </button>
        <button type="button" className="ios-icon-btn shrink-0" aria-label={ui.close} onClick={closeAll}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
