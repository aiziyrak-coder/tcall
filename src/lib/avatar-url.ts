/** Avatar URL yordamchilari */

export function userAvatarUrl(userId: string, filename: string): string {
  return `/api/user/avatar/${userId}/${filename}`;
}

export function groupAvatarUrl(conversationId: string, filename: string): string {
  return `/api/chat/group-avatar/${conversationId}/${filename}`;
}

export function resolveUserAvatar(
  avatar: string | null | undefined,
  userId: string,
  name: string
): { src: string | null; initials: string } {
  const initials = name.slice(0, 2).toUpperCase() || "?";
  if (!avatar) return { src: null, initials };
  if (avatar.startsWith("/api/") || avatar.startsWith("http")) {
    return { src: avatar, initials };
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
  if (avatar.startsWith("/api/") || avatar.startsWith("http")) {
    return { src: avatar, initials };
  }
  return { src: groupAvatarUrl(conversationId, avatar), initials };
}
