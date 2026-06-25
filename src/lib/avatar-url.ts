/** Avatar URL yordamchilari — nginx /uploads/ orqali xizmat qiladi (cookie kerak emas) */

export function userAvatarUrl(userId: string, filename: string): string {
  return `/uploads/avatars/${userId}/${filename}`;
}

export function groupAvatarUrl(conversationId: string, filename: string): string {
  return `/uploads/groups/${conversationId}/${filename}`;
}

/** Eski API yo'llarini statik uploads ga aylantirish */
export function normalizeAvatarSrc(src: string): string {
  if (src.startsWith("/api/user/avatar/")) {
    return src.replace("/api/user/avatar/", "/uploads/avatars/");
  }
  if (src.startsWith("/api/chat/group-avatar/")) {
    return src.replace("/api/chat/group-avatar/", "/uploads/groups/");
  }
  return src;
}

export function resolveUserAvatar(
  avatar: string | null | undefined,
  userId: string,
  name: string
): { src: string | null; initials: string } {
  const initials = name.slice(0, 2).toUpperCase() || "?";
  if (!avatar) return { src: null, initials };
  if (avatar.startsWith("http")) return { src: avatar, initials };
  if (avatar.startsWith("/uploads/") || avatar.startsWith("/api/")) {
    return { src: normalizeAvatarSrc(avatar), initials };
  }
  return { src: userAvatarUrl(userId, avatar), initials };
}

export function resolveGroupAvatar(
  avatar: string | null | undefined,
  conversationId: string,
  title: string
): { src: string | null; initials: string } {
  const initials = title.slice(0, 2).toUpperCase() || "G";
  if (!avatar) return { src: null, initials };
  if (avatar.startsWith("http")) return { src: avatar, initials };
  if (avatar.startsWith("/uploads/") || avatar.startsWith("/api/")) {
    return { src: normalizeAvatarSrc(avatar), initials };
  }
  return { src: groupAvatarUrl(conversationId, avatar), initials };
}
