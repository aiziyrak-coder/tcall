/** Mobil klaviaturani yopish — brauzer va Capacitor */

export function isTextInputFocused(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}

export function dismissKeyboard() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }

  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      void import("@capacitor/keyboard")
        .then(({ Keyboard }) => Keyboard.hide())
        .catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** Pastga tortganda klaviaturani yopish */
export function bindSwipeDownDismiss(
  el: HTMLElement,
  options?: { threshold?: number; shouldDismiss?: () => boolean }
): () => void {
  let startY = 0;
  let startX = 0;
  let tracking = false;
  const threshold = options?.threshold ?? 32;

  const canDismiss = () => (options?.shouldDismiss ? options.shouldDismiss() : isTextInputFocused());

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    tracking = true;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!tracking || e.touches.length !== 1 || !canDismiss()) return;
    const dy = e.touches[0].clientY - startY;
    const dx = Math.abs(e.touches[0].clientX - startX);
    if (dy > threshold && dy > dx * 1.1) {
      tracking = false;
      dismissKeyboard();
    }
  };

  const onTouchEnd = () => {
    tracking = false;
  };

  el.addEventListener("touchstart", onTouchStart, { passive: true });
  el.addEventListener("touchmove", onTouchMove, { passive: true });
  el.addEventListener("touchend", onTouchEnd, { passive: true });
  el.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchend", onTouchEnd);
    el.removeEventListener("touchcancel", onTouchEnd);
  };
}

/** Interaktiv emas joyga bosganda klaviaturani yopish */
export function shouldDismissOnPointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !target.closest(
    "button, a, input, textarea, select, label, audio, video, [contenteditable='true'], .chat-msg-delete-btn"
  );
}
