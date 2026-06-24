"use client";

import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "splash";

const SIZES: Record<LogoSize, number> = {
  xs: 36,
  sm: 52,
  md: 72,
  lg: 96,
  xl: 128,
  splash: 200,
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
          height={Math.round(px * 1.15)}
          priority={size === "splash" || size === "xl"}
          className="tcall-logo-image"
          style={{ width: px, height: "auto", maxWidth: "100%" }}
        />
      </div>
      {showTagline && (
        <p className="tcall-logo-tagline">TRANSLATE · CALL · CONNECT</p>
      )}
    </div>
  );
}
