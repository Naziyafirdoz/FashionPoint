"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

type CartState = {
  items: CartItem[];
  discount: number;
  couponCode: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  applyDiscount: (amount: number, code: string) => void;
  subtotal: () => number;
  total: () => number;
  count: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      couponCode: null,
      addItem: (item) =>
        set((s) => {
          const idx = s.items.findIndex(
            (i) =>
              i.productId === item.productId &&
              i.size === item.size &&
              i.color === item.color
          );
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = {
              ...items[idx],
              quantity: items[idx].quantity + item.quantity
            };
            return { items };
          }
          return { items: [...s.items, item] };
        }),
      removeItem: (productId, size, color) =>
        set((s) => ({
          items: s.items.filter(
            (i) =>
              !(i.productId === productId && i.size === size && i.color === color)
          )
        })),
      updateQuantity: (productId, size, color, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId && i.size === size && i.color === color
              ? { ...i, quantity: Math.max(1, quantity) }
              : i
          )
        })),
      clearCart: () => set({ items: [], discount: 0, couponCode: null }),
      applyDiscount: (amount, code) => set({ discount: amount, couponCode: code }),
      subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
      total: () => Math.max(0, get().subtotal() - get().discount),
      count: () => get().items.reduce((a, i) => a + i.quantity, 0)
    }),
    { name: "fashionpoint-cart" }
  )
);
