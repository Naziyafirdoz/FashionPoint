"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NavDropdownMap } from "@/lib/categories/nav-dropdown";

export function useNavDropdownData(slugs: string[]) {
  const [dropdowns, setDropdowns] = useState<NavDropdownMap>({});
  const [loading, setLoading] = useState(false);
  const slugsKey = slugs.join(",");
  const requestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setDropdowns({});
    requestRef.current = null;
  }, [slugsKey]);

  const loadDropdowns = useCallback(async () => {
    if (slugs.length === 0) return;
    if (requestRef.current) {
      await requestRef.current;
      return;
    }

    const request = (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/categories/nav-dropdowns?slugs=${encodeURIComponent(slugs.join(","))}`
        );
        const data = (await res.json()) as { dropdowns?: NavDropdownMap };
        if (res.ok) {
          setDropdowns(data.dropdowns ?? {});
        }
      } finally {
        setLoading(false);
        requestRef.current = null;
      }
    })();

    requestRef.current = request;
    await request;
  }, [slugs]);

  return { dropdowns, loading, loadDropdowns };
}
