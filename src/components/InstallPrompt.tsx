"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import { isNativeApp } from "@/lib/native-app";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({ userLanguage }: { userLanguage?: string }) {
  const ui = useUI(userLanguage || "uz");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
    if (localStorage.getItem("tcall:install-dismissed")) {
      setDismissed(true);
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!deferred || dismissed) return null;

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
          onClick={() => void deferred.prompt().then(() => setDeferred(null))}
        >
          {ui.installAppAction}
        </button>
        <button
          type="button"
          className="ios-icon-btn shrink-0"
          aria-label={ui.close}
          onClick={() => {
            localStorage.setItem("tcall:install-dismissed", "1");
            setDismissed(true);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
