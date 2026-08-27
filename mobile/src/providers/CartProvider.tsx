import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { readJson, writeJson } from "@/lib/persist";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
  slug: string;
};

type CartContextValue = {
  items: CartItem[];
  discount: number;
  ready: boolean;
  buyNowItems: CartItem[] | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  startBuyNow: (item: CartItem) => void;
  clearBuyNow: () => void;
  subtotal: number;
  total: number;
  count: number;
};

const CART_KEY = "fashionpoint-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

function sameLine(a: CartItem, productId: string, size: string, color: string) {
  return a.productId === productId && a.size === size && a.color === color;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [ready, setReady] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState<CartItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await readJson<{ items?: CartItem[]; discount?: number }>(CART_KEY);
      if (!mounted) return;
      setItems(Array.isArray(stored?.items) ? stored.items : []);
      setDiscount(typeof stored?.discount === "number" ? stored.discount : 0);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void writeJson(CART_KEY, { items, discount });
  }, [items, discount, ready]);

  const addItem = useCallback((item: CartItem) => {
    setItems((current) => {
      const index = current.findIndex((row) =>
        sameLine(row, item.productId, item.size, item.color)
      );
      if (index < 0) return [...current, item];
      const next = [...current];
      next[index] = {
        ...next[index],
        quantity: next[index].quantity + item.quantity,
      };
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string, size: string, color: string) => {
    setItems((current) => current.filter((row) => !sameLine(row, productId, size, color)));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, size: string, color: string, quantity: number) => {
      if (quantity < 1) {
        setItems((current) => current.filter((row) => !sameLine(row, productId, size, color)));
        return;
      }
      setItems((current) =>
        current.map((row) =>
          sameLine(row, productId, size, color) ? { ...row, quantity } : row
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
  }, []);

  const startBuyNow = useCallback((item: CartItem) => {
    setBuyNowItems([item]);
  }, []);

  const clearBuyNow = useCallback(() => {
    setBuyNowItems(null);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const total = Math.max(0, subtotal - discount);
  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      discount,
      ready,
      buyNowItems,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      startBuyNow,
      clearBuyNow,
      subtotal,
      total,
      count,
    }),
    [
      items,
      discount,
      ready,
      buyNowItems,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      startBuyNow,
      clearBuyNow,
      subtotal,
      total,
      count,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
