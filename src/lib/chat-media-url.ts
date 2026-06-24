/** Legacy /uploads/... va yangi /api/chat/file/... URLlarni birlashtiradi */
export function resolveChatMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/uploads/chat/")) {
    const rest = url.slice("/uploads/chat/".length);
    const [userId, ...nameParts] = rest.split("/");
    const name = nameParts.join("/");
    if (userId && name) return `/api/chat/file/${userId}/${name}`;
  }
  return url;
}
