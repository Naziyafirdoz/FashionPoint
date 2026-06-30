"use client";

import { create } from "zustand";
import {
  deleteWishlistItem,
  fetchWishlistProductIds,
  insertWishlistItem
} from "@/lib/wishlist/persist";

type WishlistState = {
  ids: Set<string>;
  hydrated: boolean;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  hydrate: () => Promise<void>;
  setIds: (ids: Iterable<string>) => void;
  removeId: (productId: string) => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  hydrated: false,

  toggle: (productId) => {
    const adding = !get().has(productId);

    set((state) => {
      const next = new Set(state.ids);
      if (adding) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return { ids: next };
    });

    void (async () => {
      const persisted = adding
        ? await insertWishlistItem(productId)
        : await deleteWishlistItem(productId);

      if (!persisted && get().has(productId) === adding) {
        set((state) => {
          const next = new Set(state.ids);
          if (adding) {
            next.delete(productId);
          } else {
            next.add(productId);
          }
          return { ids: next };
        });
      }
    })();
  },

  has: (productId) => get().ids.has(productId),

  clear: () => set({ ids: new Set(), hydrated: false }),

  hydrate: async () => {
    const ids = await fetchWishlistProductIds();
    set({ ids: new Set(ids), hydrated: true });
  },

  setIds: (ids) => set({ ids: new Set(ids) }),

  removeId: (productId) =>
    set((state) => {
      const next = new Set(state.ids);
      next.delete(productId);
      return { ids: next };
    })
}));
