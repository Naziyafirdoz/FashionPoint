import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { resolveAuthoritativeOrderItems } from "@/lib/checkout/authoritative-pricing";
import { validateOrderItems } from "@/lib/checkout/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const itemValidation = validateOrderItems(body?.items);
  if (!itemValidation.ok) {
    return NextResponse.json({ error: itemValidation.error }, { status: 400 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const pricing = await resolveAuthoritativeOrderItems(db, itemValidation.items, {
    compareClientPrices: false
  });
  if (!pricing.ok) {
    return NextResponse.json(
      {
        error: pricing.error,
        ...(pricing.code ? { code: pricing.code } : {}),
        ...(pricing.items ? { items: pricing.items } : {})
      },
      { status: pricing.status }
    );
  }

  return NextResponse.json({
    items: pricing.items.map((item) => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      catalogUnitPrice: item.catalogUnitPrice ?? item.price,
      discountPerUnit: item.discountPerUnit ?? 0,
      effectiveUnitPrice: item.effectiveUnitPrice ?? item.price,
      lineDiscount: item.lineDiscount ?? 0,
      lineTotal: item.lineTotal ?? item.price * item.quantity,
      appliedOffer: item.appliedOffer ?? null
    })),
    subtotalBeforeOffers: pricing.subtotal,
    totalOfferDiscount: pricing.offerDiscount,
    subtotalAfterOffers: pricing.subtotalAfterOffers
  });
}
