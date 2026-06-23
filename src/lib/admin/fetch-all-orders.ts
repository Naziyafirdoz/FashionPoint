import type { Order } from "@/types";

export async function fetchAllOrdersForAdmin(): Promise<Order[]> {
  const limit = 100;
  let page = 1;
  let all: Order[] = [];
  let total = Infinity;

  while (all.length < total) {
    const res = await fetch(`/api/orders?tab=all&limit=${limit}&page=${page}`, {
      cache: "no-store"
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch = (data.orders ?? []) as Order[];
    all = all.concat(batch);
    total = typeof data.total === "number" ? data.total : batch.length;
    if (batch.length < limit) break;
    page += 1;
  }

  return all;
}
