"use client";

import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "splash";

const SIZES: Record<LogoSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 88,
  splash: 120,
};

interface TcallLogoProps {
  size?: LogoSize;
  animate?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function TcallLogo({
  size = "md",
  animate = false,
  showTagline = false,
  className = "",
}: TcallLogoProps) {
  const px = SIZES[size];

  return (
    <div className={`tcall-logo-wrap ${className}`}>
      <div className={`tcall-logo-img ${animate ? "tcall-logo-pulse" : ""}`}>
        <Image
          src="/logo.png"
          alt="Tcall"
          width={px}
          height={px}
          priority={size === "splash" || size === "xl"}
          className="object-contain"
          style={{ width: px, height: "auto" }}
        />
      </div>
      {showTagline && (
        <p className="tcall-logo-tagline">TRANSLATE · CALL · CONNECT</p>
      )}
    </div>
  );
}
