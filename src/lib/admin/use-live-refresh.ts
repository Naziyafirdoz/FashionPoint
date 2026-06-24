"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";

const DEFAULT_INTERVAL_MS = 60_000;

type UseLiveRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveRefresh(
  onRefresh: () => void | Promise<void>,
  options: UseLiveRefreshOptions = {}
) {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const { lastUpdated, touch } = useLiveTimestamp();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [isTabVisible, setIsTabVisible] = useState(
    () => typeof document === "undefined" || !document.hidden
  );

  const refresh = useCallback(async () => {
    await onRefreshRef.current();
    touch();
  }, [touch]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      if (visible && enabled) {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !isTabVisible) return;

    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, isTabVisible, intervalMs, refresh]);

  const isLive = enabled && isTabVisible;

  return { lastUpdated, isLive, refresh, touch };
}
