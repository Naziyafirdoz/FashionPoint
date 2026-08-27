import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError, toUserMessage } from "@/lib/api";
import {
  fetchProductList,
  type CatalogProduct,
} from "@/lib/catalog";
import { deleteJson, readJson, writeJson } from "@/lib/persist";
import {
  deleteSignedInWishlistItem,
  fetchSignedInWishlist,
  insertSignedInWishlistItem,
} from "@/lib/wishlist";
import { useAuth } from "@/providers/AuthProvider";

export type WishlistItem = {
  id: string;
  product_id: string;
  created_at?: string;
  product: CatalogProduct;
};

type GuestWishlistEntry = { id: string; slug: string };

type WishlistContextValue = {
  items: WishlistItem[];
  ids: Set<string>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isWished: (productId: string) => boolean;
  toggle: (product: { id: string; slug: string } & Partial<CatalogProduct>) => Promise<void>;
  remove: (productId: string, slug?: string) => Promise<void>;
};

const GUEST_KEY = "fashionpoint-guest-wishlist";

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGuest = useCallback(async () => {
    const stored = (await readJson<GuestWishlistEntry[] | string[]>(GUEST_KEY)) ?? [];
    const entries: GuestWishlistEntry[] = stored
      .map((row) =>
        typeof row === "string" ? { id: row, slug: "" } : { id: row.id, slug: row.slug }
      )
      .filter((row) => row.id);
    const slugs = entries.map((row) => row.slug).filter(Boolean);
    if (slugs.length === 0) {
      setItems([]);
      return;
    }
    const result = await fetchProductList({ slugs: slugs.join(","), limit: 48 });
    setItems(
      result.products.map((product) => ({
        id: product.id,
        product_id: product.id,
        product,
      }))
    );
  }, []);

  const loadServer = useCallback(async () => {
    const items = await fetchSignedInWishlist();
    setItems(items);
  }, []);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (user) {
        await loadServer();
      } else {
        await loadGuest();
      }
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Unable to load wishlist."));
    } finally {
      setLoading(false);
    }
  }, [authLoading, loadGuest, loadServer, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistGuest = useCallback(async (nextItems: WishlistItem[]) => {
    if (nextItems.length === 0) {
      await deleteJson(GUEST_KEY);
      return;
    }
    await writeJson(
      GUEST_KEY,
      nextItems.map((item) => ({ id: item.product_id, slug: item.product.slug }))
    );
  }, []);

  const toggle = useCallback(
    async (product: { id: string; slug: string } & Partial<CatalogProduct>) => {
      const exists = items.some((item) => item.product_id === product.id);

      if (user) {
        try {
          if (exists) {
            await deleteSignedInWishlistItem(product.id);
            setItems((current) => current.filter((item) => item.product_id !== product.id));
            return;
          }
          const row = await insertSignedInWishlistItem(product.id);
          const item: WishlistItem = {
            id: row.id,
            product_id: row.product_id,
            created_at: row.created_at,
            product: {
              ...product,
              name: product.name ?? "",
              slug: product.slug,
              price: product.price ?? 0,
              is_active: product.is_active ?? true,
            } as CatalogProduct,
          };
          setItems((current) => [item, ...current.filter((entry) => entry.product_id !== product.id)]);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            throw err;
          }
          throw new ApiError(toUserMessage(err, "Unable to update wishlist."), 500);
        }
        return;
      }

      const next = exists
        ? items.filter((item) => item.product_id !== product.id)
        : [
            {
              id: product.id,
              product_id: product.id,
              product: {
                ...product,
                name: product.name ?? "",
                slug: product.slug,
                price: product.price ?? 0,
                is_active: product.is_active ?? true,
              } as CatalogProduct,
            },
            ...items,
          ];
      setItems(next);
      await persistGuest(next);
    },
    [items, persistGuest, user]
  );

  const remove = useCallback(
    async (productId: string, slug = "") => {
      const existing = items.find((item) => item.product_id === productId);
      await toggle({ id: productId, slug: existing?.product.slug ?? slug });
    },
    [items, toggle]
  );

  const ids = useMemo(() => new Set(items.map((item) => item.product_id)), [items]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      ids,
      loading,
      error,
      refresh,
      isWished: (productId: string) => ids.has(productId),
      toggle,
      remove,
    }),
    [error, ids, items, loading, refresh, remove, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return context;
}
