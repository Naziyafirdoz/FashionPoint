"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWishlistStore } from "@/stores/wishlist";

export function WishlistHydrator() {
  const hydrate = useWishlistStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();

    const supabase = createClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void hydrate();
    });

    return () => subscription.unsubscribe();
  }, [hydrate]);

  return null;
}
