import type { SupabaseClient } from "@supabase/supabase-js";

export type BackInStockRequestStatus = "pending" | "sent" | "cancelled";

export type BackInStockRequestRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  product_image: string | null;
  customer_name: string;
  customer_email: string;
  user_id: string | null;
  status: BackInStockRequestStatus;
  cancel_reason: string | null;
  notified_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  current_stock: number;
};

export type BackInStockRequestsSummary = {
  total: number;
  pending: number;
  sent: number;
  cancelled: number;
};

export type ListBackInStockRequestsParams = {
  search?: string;
  status?: BackInStockRequestStatus | "all";
  sort?: "newest" | "oldest" | "product" | "customer";
  page?: number;
  pageSize?: number;
};

type RawRequest = {
  id: string;
  product_id: string;
  product_name: string | null;
  customer_name: string;
  customer_email: string;
  user_id: string | null;
  status: string;
  cancel_reason: string | null;
  notified_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type ProductMeta = {
  stock: number;
  image: string | null;
};

export async function listBackInStockRequests(
  db: SupabaseClient,
  params: ListBackInStockRequestsParams = {}
): Promise<{ rows: BackInStockRequestRow[]; total: number; summary: BackInStockRequestsSummary }> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select(
      "id, product_id, product_name, customer_name, customer_email, user_id, status, cancel_reason, notified_at, cancelled_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data ?? []) as RawRequest[];
  const productIds = [...new Set(requests.map((row) => row.product_id).filter(Boolean))];

  const productMeta = new Map<string, ProductMeta>();
  if (productIds.length > 0) {
    const { data: products } = await db
      .from("products")
      .select("id, stock_quantity, images")
      .in("id", productIds);

    for (const product of products ?? []) {
      const images = Array.isArray(product.images) ? product.images : [];
      productMeta.set(product.id, {
        stock: Number(product.stock_quantity ?? 0),
        image: typeof images[0] === "string" ? images[0] : null
      });
    }
  }

  let rows: BackInStockRequestRow[] = requests.map((row) => {
    const meta = productMeta.get(row.product_id);
    return {
      ...row,
      status: row.status as BackInStockRequestStatus,
      product_image: meta?.image ?? null,
      current_stock: meta?.stock ?? 0
    };
  });

  const summary: BackInStockRequestsSummary = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    sent: rows.filter((r) => r.status === "sent").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length
  };

  const search = params.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (row) =>
        row.product_name?.toLowerCase().includes(search) ||
        row.customer_name.toLowerCase().includes(search) ||
        row.customer_email.toLowerCase().includes(search)
    );
  }

  if (params.status && params.status !== "all") {
    rows = rows.filter((row) => row.status === params.status);
  }

  switch (params.sort) {
    case "oldest":
      rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case "product":
      rows.sort((a, b) => (a.product_name ?? "").localeCompare(b.product_name ?? ""));
      break;
    case "customer":
      rows.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
      break;
    case "newest":
    default:
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
  }

  const total = rows.length;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 15, 100));
  const start = (page - 1) * pageSize;
  rows = rows.slice(start, start + pageSize);

  return { rows, total, summary };
}

export async function updateBackInStockRequestStatus(
  db: SupabaseClient,
  id: string,
  status: BackInStockRequestStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch: Record<string, unknown> = { status };
  if (status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from("out_of_stock_requests")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Unable to update request." };
  }

  return { ok: true };
}
