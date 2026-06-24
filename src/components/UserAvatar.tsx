"use client";

import { resolveUserAvatar, resolveGroupAvatar } from "@/lib/avatar-url";

interface UserAvatarProps {
  userId?: string;
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface GroupAvatarProps {
  conversationId: string;
  title: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isGroup?: boolean;
}

const SIZE_CLASS = {
  sm: "user-avatar-sm",
  md: "user-avatar-md",
  lg: "user-avatar-lg",
  xl: "user-avatar-xl",
};

export function UserAvatar({ userId, name, avatar, size = "md", className = "" }: UserAvatarProps) {
  const { src, initials } = userId
    ? resolveUserAvatar(avatar, userId, name)
    : { src: avatar || null, initials: name.slice(0, 2).toUpperCase() || "?" };

  return (
    <div className={`user-avatar ${SIZE_CLASS[size]} ${className}`} aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="user-avatar-img" />
      ) : (
        <span className="user-avatar-initials">{initials}</span>
      )}
    </div>
  );
}

export function GroupAvatar({
  conversationId,
  title,
  avatar,
  size = "md",
  className = "",
  isGroup,
}: GroupAvatarProps) {
  const { src, initials } = resolveGroupAvatar(avatar, conversationId, title);

  return (
    <div
      className={`user-avatar ${SIZE_CLASS[size]} ${isGroup ? "user-avatar-group" : ""} ${className}`}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="user-avatar-img" />
      ) : (
        <span className="user-avatar-initials">{initials}</span>
      )}
    </div>
  );
}
