import { isStandaloneDisplay } from "@/lib/app-fullscreen";
import { isIOS, isMobileDevice } from "@/lib/mobile";
import { isNativeApp } from "@/lib/native-app";

const DISMISS_KEY = "tcall:install-dismissed";
const IOS_DISMISS_KEY = "tcall:ios-install-dismissed";

export function isPWACapableWeb(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false;
  if (isStandaloneDisplay()) return false;
  return isMobileDevice();
}

export function isIOSChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  return /CriOS/i.test(navigator.userAgent);
}

export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
}

export function wasInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function wasIOSInstallDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function dismissIOSInstallPrompt(): void {
  try {
    localStorage.setItem(IOS_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowIOSInstallGuide(): boolean {
  return isPWACapableWeb() && isIOSSafari() && !wasIOSInstallDismissed();
}

export function shouldShowIOSChromeHint(): boolean {
  return isPWACapableWeb() && isIOS() && isIOSChrome() && !wasIOSInstallDismissed();
}

/** PWA / telefon — har doim mobil (pastki tab) layout */
export function preferMobileAppLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  if (isStandaloneDisplay()) return true;
  return isMobileDevice();
}
