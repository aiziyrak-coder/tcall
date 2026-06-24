"use client";

import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "splash";
type LogoLayout = "vertical" | "horizontal";
type LogoVariant = "auto" | "full" | "icon";

/** Full brand lockup aspect ratio (743×159) */
const LOGO_ASPECT = 743 / 159;

const WIDTHS: Record<LogoSize, number> = {
  xs: 96,
  sm: 120,
  md: 148,
  lg: 180,
  xl: 220,
  splash: 280,
};

interface TcallLogoProps {
  size?: LogoSize;
  animate?: boolean;
  showTagline?: boolean; // logo.png already includes tagline
  layout?: LogoLayout;
  variant?: LogoVariant;
  title?: string;
  subtitle?: string;
  className?: string;
}

function resolveVariant(variant: LogoVariant, size: LogoSize): "full" | "icon" {
  if (variant === "full") return "full";
  if (variant === "icon") return "icon";
  return size === "xs" ? "icon" : "full";
}

export function TcallLogo({
  size = "md",
  animate = false,
  layout = "vertical",
  variant = "auto",
  title,
  subtitle,
  className = "",
}: TcallLogoProps) {
  const width = WIDTHS[size];
  const horizontal = layout === "horizontal";
  const mode = resolveVariant(variant, size);
  const iconOnly = mode === "icon";
  const src = iconOnly ? "/logo-icon.png" : "/logo.png";
  const imgWidth = iconOnly ? width : width;
  const imgHeight = iconOnly ? width : Math.round(width / LOGO_ASPECT);

  const textBlock = (title || subtitle) && (
    <div className={`tcall-logo-text ${horizontal ? "tcall-logo-text-side" : ""}`}>
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
          src={src}
          alt="Tcall — Translate · Call · Connect"
          width={imgWidth}
          height={imgHeight}
          priority={size === "splash" || size === "xl"}
          className="tcall-logo-image"
          style={{
            width: imgWidth,
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
