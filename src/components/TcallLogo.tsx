"use client";

import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "splash";
type LogoLayout = "vertical" | "horizontal";

const SIZES: Record<LogoSize, number> = {
  xs: 40,
  sm: 56,
  md: 80,
  lg: 108,
  xl: 140,
  splash: 180,
};

interface TcallLogoProps {
  size?: LogoSize;
  animate?: boolean;
  showTagline?: boolean;
  layout?: LogoLayout;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function TcallLogo({
  size = "md",
  animate = false,
  showTagline = false,
  layout = "vertical",
  title,
  subtitle,
  className = "",
}: TcallLogoProps) {
  const px = SIZES[size];
  const horizontal = layout === "horizontal";

  const textBlock = (showTagline || title || subtitle) && (
    <div className={`tcall-logo-text ${horizontal ? "tcall-logo-text-side" : ""}`}>
      {showTagline && (
        <p className="tcall-logo-tagline">Translate · Call · Connect</p>
      )}
      {title && <p className="tcall-logo-title">{title}</p>}
      {subtitle && <p className="tcall-logo-subtitle">{subtitle}</p>}
    </div>
  );

  return (
    <div
      className={`tcall-logo-wrap ${horizontal ? "tcall-logo-horizontal" : ""} ${className}`}
    >
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
      {textBlock}
    </div>
  );
}
