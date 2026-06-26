"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface HeaderActionMenuProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  ariaLabel?: string;
  panelClassName?: string;
}

const MENU_GAP = 8;
const VIEWPORT_PAD = 12;

export function HeaderActionMenu({
  open,
  onClose,
  anchorRef,
  children,
  ariaLabel,
  panelClassName = "",
}: HeaderActionMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const safeBottom =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--app-safe-bottom")
      ) || 0;

    const panelW = panelRect.width || 280;
    const panelH = panelRect.height || 160;

    let top = rect.bottom + MENU_GAP;
    if (
      top + panelH > vh - VIEWPORT_PAD - safeBottom &&
      rect.top - MENU_GAP - panelH > VIEWPORT_PAD
    ) {
      top = rect.top - MENU_GAP - panelH;
    }
    top = Math.max(VIEWPORT_PAD, top);

    let right = vw - rect.right;
    if (vw - right - panelW < VIEWPORT_PAD) {
      right = vw - panelW - VIEWPORT_PAD;
    }
    right = Math.max(VIEWPORT_PAD, Math.min(right, vw - panelW - VIEWPORT_PAD));

    setStyle({ top, right, visibility: "visible" });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="header-menu-overlay" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={`header-menu-dropdown ${panelClassName}`.trim()}
        style={style}
        role="menu"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
