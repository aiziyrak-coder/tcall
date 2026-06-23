export type UserStatus = "available" | "busy" | "dnd" | "away";

export const STATUS_OPTIONS: { value: UserStatus; color: string }[] = [
  { value: "available", color: "text-green-400" },
  { value: "busy", color: "text-yellow-400" },
  { value: "dnd", color: "text-red-400" },
  { value: "away", color: "text-white/40" },
];

export function getStatusLabel(status: string, ui: Record<string, string>): string {
  const map: Record<string, string> = {
    available: ui.statusAvailable,
    busy: ui.statusBusy,
    dnd: ui.statusDnd,
    away: ui.statusAway,
  };
  return map[status] || status;
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
