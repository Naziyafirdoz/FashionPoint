"use client";

import { create } from "zustand";

type WishlistState = {
  ids: Set<string>;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  toggle: (productId) =>
    set((s) => {
      const next = new Set(s.ids);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return { ids: next };
    }),
  has: (productId) => get().ids.has(productId),
  clear: () => set({ ids: new Set() })
}));

