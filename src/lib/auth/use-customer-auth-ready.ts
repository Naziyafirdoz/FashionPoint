"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AUTH_READY_TIMEOUT_MS = 8_000;

/**
 * Resolves when the browser Supabase session is available for authenticated API calls.
 * Email / external links often hydrate before cookies are readable client-side.
 */
export function useCustomerAuthReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.info("[auth] waiting");
    const supabase = createClient();
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) {
        console.info("[auth] ready");
        setReady(true);
      }
    };

    const resolveAuth = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.auth.refreshSession().catch(() => undefined);
        markReady();
        return true;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        markReady();
        return true;
      }

      return false;
    };

    void resolveAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        markReady();
      }
    });

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("[auth] timeout — allowing fetch attempt");
        markReady();
      }
    }, AUTH_READY_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return ready;
}
