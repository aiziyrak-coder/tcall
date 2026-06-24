const REMEMBER_EMAIL_KEY = "tcall:remember-email";
const REMEMBER_FLAG_KEY = "tcall:remember-me";

export function loadRememberedLogin(): { email: string; remember: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const remember = localStorage.getItem(REMEMBER_FLAG_KEY) === "1";
    const email = localStorage.getItem(REMEMBER_EMAIL_KEY)?.trim() || "";
    if (!remember || !email) return null;
    return { email, remember: true };
  } catch {
    return null;
  }
}

export function saveRememberMe(email: string, remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (remember && email.trim()) {
      localStorage.setItem(REMEMBER_FLAG_KEY, "1");
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(REMEMBER_FLAG_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch {
    /* ignore */
  }
}
