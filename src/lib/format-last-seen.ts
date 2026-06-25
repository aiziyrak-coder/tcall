export function formatLastSeen(iso: string | null | undefined, ui: Record<string, string>): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return ui.lastSeenJustNow;
  if (diffMin < 60) return ui.lastSeenMinutes.replace("{n}", String(diffMin));

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) return ui.lastSeenToday.replace("{time}", time);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return ui.lastSeenYesterday.replace("{time}", time);

  const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short" });
  return ui.lastSeenDate.replace("{date}", dateStr).replace("{time}", time);
}

export function peerStatusLabel(
  online: boolean,
  lastSeenAt: string | null | undefined,
  ui: Record<string, string>
): string {
  if (online) return ui.online;
  const seen = formatLastSeen(lastSeenAt, ui);
  return seen ? ui.lastSeen.replace("{when}", seen) : ui.offline;
}
