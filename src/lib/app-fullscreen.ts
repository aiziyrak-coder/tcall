/** PWA / standalone rejimida ochilganmi */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

/** Brauzer fullscreen (foydalanuvchi "Boshlash" bosganda) */
export async function requestAppFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (isStandaloneDisplay()) return true;

  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (document.fullscreenElement) return true;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* ruxsat rad etildi yoki qo'llab-quvvatlanmaydi */
  }
  return false;
}

export function enableWebAppChrome() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("web-app");
  document.body.classList.add("web-app");
}
