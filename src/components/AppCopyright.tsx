"use client";

import { getUI } from "@/lib/languages";

interface AppCopyrightProps {
  userLanguage?: string;
  compact?: boolean;
  className?: string;
}

export function AppCopyright({
  userLanguage = "uz",
  compact = false,
  className = "",
}: AppCopyrightProps) {
  const ui = getUI(userLanguage);

  return (
    <p
      className={`app-copyright ${compact ? "app-copyright-compact" : ""} ${className}`}
    >
      {ui.copyrightCreated}
      <br />
      {ui.copyrightRights}
    </p>
  );
}
