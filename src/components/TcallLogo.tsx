"use client";

import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "splash";
type LogoLayout = "vertical" | "horizontal";
type LogoVariant = "auto" | "full" | "icon";

const SIZES: Record<LogoSize, number> = {
  xs: 40,
  sm: 56,
  md: 80,
  lg: 108,
  xl: 140,
  splash: 180,
};

/** Logo PNG: icon artwork is in the top ~58% */
const ICON_RATIO = 0.58;

interface TcallLogoProps {
  size?: LogoSize;
  animate?: boolean;
  showTagline?: boolean;
  layout?: LogoLayout;
  variant?: LogoVariant;
  title?: string;
  subtitle?: string;
  className?: string;
}

function resolveVariant(
  variant: LogoVariant,
  size: LogoSize,
  horizontal: boolean
): "full" | "icon" {
  if (variant === "full") return "full";
  if (variant === "icon") return "icon";
  if (size === "splash" || size === "xl" || size === "lg") return "full";
  if (horizontal) return "icon";
  return size === "xs" || size === "sm" ? "icon" : "full";
}

export function TcallLogo({
  size = "md",
  animate = false,
  showTagline = false,
  layout = "vertical",
  variant = "auto",
  title,
  subtitle,
  className = "",
}: TcallLogoProps) {
  const px = SIZES[size];
  const horizontal = layout === "horizontal";
  const mode = resolveVariant(variant, size, horizontal);
  const iconOnly = mode === "icon";

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
      <div
        className={`tcall-logo-img ${animate ? "tcall-logo-pulse" : ""} ${iconOnly ? "tcall-logo-icon-crop" : ""}`}
        style={
          iconOnly
            ? { width: px, height: Math.round(px * ICON_RATIO) }
            : { width: px }
        }
      >
        <Image
          src="/logo.png"
          alt="Tcall"
          width={px}
          height={Math.round(px / ICON_RATIO)}
          priority={size === "splash" || size === "xl"}
          className="tcall-logo-image"
          style={{
            width: px,
            height: "auto",
            maxWidth: "100%",
          }}
          unoptimized
        />
      </div>
      {textBlock}
    </div>
  );
}
