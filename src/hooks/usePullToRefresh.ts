"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 72,
}: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setDistance(0);
      setPulling(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement | null;
      const scrollRoot =
        el?.closest(".app-tab-scroll, .chat-list-view, .ios-keypad-recents") as HTMLElement | null;
      if (!scrollRoot || scrollRoot.scrollTop > 0 || refreshing) return;
      active.current = true;
      startY.current = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || refreshing) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) {
        setDistance(0);
        setPulling(false);
        return;
      }
      e.preventDefault();
      const d = Math.min(dy * 0.45, threshold * 1.4);
      setDistance(d);
      setPulling(d > 12);
    };

    const onTouchEnd = () => {
      if (!active.current) return;
      active.current = false;
      if (distance >= threshold && !refreshing) {
        void runRefresh();
      } else {
        setDistance(0);
        setPulling(false);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [distance, enabled, refreshing, runRefresh, threshold]);

  return { pulling, distance, refreshing };
}
