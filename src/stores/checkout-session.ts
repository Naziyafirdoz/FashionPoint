"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types";

type CheckoutSessionState = {
  mode: "cart" | "buy_now";
  buyNowItem: CartItem | null;
  startBuyNow: (item: CartItem) => void;
  endSession: () => void;
};

export const useCheckoutSession = create<CheckoutSessionState>()(
  persist(
    (set) => ({
      mode: "cart",
      buyNowItem: null,
      startBuyNow: (item) => set({ mode: "buy_now", buyNowItem: item }),
      endSession: () => set({ mode: "cart", buyNowItem: null })
    }),
    {
      name: "fashionpoint-checkout-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) =>
        state.mode === "buy_now" && state.buyNowItem
          ? { mode: state.mode, buyNowItem: state.buyNowItem }
          : { mode: "cart", buyNowItem: null }
    }
  )
);
