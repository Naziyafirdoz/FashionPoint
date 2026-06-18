"use client";

import { useEffect } from "react";

export function TrackRecentlyViewed({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const key = "fp_recent";
      const raw = localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [slug, ...arr.filter((s) => s !== slug)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [slug]);
  return null;
}

