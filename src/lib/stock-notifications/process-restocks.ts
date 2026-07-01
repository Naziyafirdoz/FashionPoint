import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { RESEND_FROM_ALERTS_STORE } from "@/lib/server/resend-from-addresses";
import { buildBackInStockEmail } from "@/lib/stock-notifications/email-template";
import { processDiscontinuedProductNotifications } from "@/lib/stock-notifications/process-discontinued";
import { buildProductPageUrl } from "@/lib/stock-notifications/product-url";
import { resolveRequestRecipientEmail } from "@/lib/stock-notifications/request-email";
import { markStockRequestSent } from "@/lib/stock-notifications/request-status";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type PendingRequestRow = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  email?: string | null;
  status: string;
};

type RestockProduct = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  stock_quantity: number;
  status: string;
};

async function loadRestockProduct(
  db: SupabaseClient,
  productId: string
): Promise<RestockProduct | null> {
  const { data, error } = await db
    .from("products")
    .select("id, name, slug, images, stock_quantity, status")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("[back-in-stock] product lookup failed", {
      productId,
      message: error.message
    });
    return null;
  }

  if (!data) return null;

  const slug = data.slug?.trim();
  if (!slug) {
    console.error("[back-in-stock] product missing slug", { productId });
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug,
    images: Array.isArray(data.images) ? data.images : [],
    stock_quantity: Number(data.stock_quantity ?? 0),
    status: data.status ?? "active"
  };
}

async function loadCategorySlug(
  db: SupabaseClient,
  productId: string
): Promise<string | null> {
  const { data } = await db
    .from("products")
    .select("categories(slug)")
    .eq("id", productId)
    .maybeSingle();

  const categories = data?.categories as { slug?: string } | { slug?: string }[] | null;
  if (Array.isArray(categories)) return categories[0]?.slug ?? null;
  return categories?.slug ?? null;
}

async function loadPendingRequestIds(
  db: SupabaseClient,
  productId: string
): Promise<string[]> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "pending");

  if (error) {
    console.error("[back-in-stock] failed to load pending notifications", {
      productId,
      message: error.message
    });
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function loadFreshRequest(
  db: SupabaseClient,
  requestId: string
): Promise<PendingRequestRow | null> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select("id, customer_name, customer_email, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    console.error("[back-in-stock] failed to reload request before customer email", {
      requestId,
      message: error?.message
    });
    return null;
  }

  return data as PendingRequestRow;
}

export async function processBackInStockNotifications(
  db: SupabaseClient,
  productId: string
): Promise<void> {
  const product = await loadRestockProduct(db, productId);

  if (!product) {
    const categorySlug = await loadCategorySlug(db, productId);
    const { data: pendingRows } = await db
      .from("out_of_stock_requests")
      .select("product_name")
      .eq("product_id", productId)
      .eq("status", "pending")
      .limit(1);

    await processDiscontinuedProductNotifications(db, {
      productId,
      productName: pendingRows?.[0]?.product_name ?? "this product",
      categorySlug
    });
    return;
  }

  if (product.status === "archived") {
    const categorySlug = await loadCategorySlug(db, productId);
    await processDiscontinuedProductNotifications(db, {
      productId,
      productName: product.name,
      categorySlug
    });
    return;
  }

  if (product.stock_quantity <= 0) {
    return;
  }

  const pendingIds = await loadPendingRequestIds(db, productId);
  if (!pendingIds.length) return;

  const productUrl = buildProductPageUrl(product.slug);
  if (!productUrl) {
    console.error("[back-in-stock] invalid product URL — emails skipped", {
      productId,
      slug: product.slug
    });
    return;
  }

  if (!resend) {
    console.warn("[back-in-stock] RESEND_API_KEY not configured — skipping customer emails");
    return;
  }

  const productImage = product.images[0] ?? null;

  await Promise.all(
    pendingIds.map((requestId) =>
      sendRestockEmailToRequest(db, requestId, {
        productName: product.name,
        productSlug: product.slug,
        productImage
      })
    )
  );
}

async function sendRestockEmailToRequest(
  db: SupabaseClient,
  requestId: string,
  product: { productName: string; productSlug: string; productImage: string | null }
): Promise<void> {
  const fresh = await loadFreshRequest(db, requestId);
  if (!fresh || fresh.status !== "pending") return;

  const recipient = resolveRequestRecipientEmail(fresh);
  if (!recipient) {
    console.error("[back-in-stock] restock email skipped — no stored request email", {
      requestId
    });
    return;
  }

  const { subject, html } = buildBackInStockEmail({
    customerName: fresh.customer_name,
    productName: product.productName,
    productSlug: product.productSlug,
    productImageUrl: product.productImage
  });

  try {
    await resend!.emails.send({
      from: RESEND_FROM_ALERTS_STORE,
      to: recipient,
      subject,
      html
    });
  } catch (err) {
    console.error("[back-in-stock] customer email send failed", {
      requestId,
      to: recipient,
      message: err instanceof Error ? err.message : String(err)
    });
    return;
  }

  await markStockRequestSent(db, requestId, new Date().toISOString());
}
