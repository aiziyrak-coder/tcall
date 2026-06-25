export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "tcall:theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark") return v;
  if (v === "system") return "light";
  return "light";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  return "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function setTheme(mode: ThemeMode) {
  const stored: ThemeMode = mode === "system" ? "light" : mode;
  localStorage.setItem(STORAGE_KEY, stored);
  applyTheme(stored);
}
