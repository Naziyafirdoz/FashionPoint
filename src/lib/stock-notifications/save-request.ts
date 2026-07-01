import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidEmail } from "@/lib/checkout/contact-validation";
import type { SaveStockNotificationInput, SaveStockNotificationResult } from "./types";

export function normalizeStockNotificationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateStockNotificationInput(
  input: SaveStockNotificationInput
): string | null {
  const name = input.customerName.trim();
  if (name.length < 2) {
    return "Please enter your full name (at least 2 characters).";
  }

  const email = normalizeStockNotificationEmail(input.customerEmail);
  if (!email) {
    return "Please enter a valid email address.";
  }
  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  if (!input.productId?.trim()) {
    return "Product is required.";
  }

  return null;
}

export async function saveStockNotificationRequest(
  db: SupabaseClient,
  input: SaveStockNotificationInput
): Promise<SaveStockNotificationResult> {
  const validationError = validateStockNotificationInput(input);
  if (validationError) {
    return { ok: false, code: "validation", message: validationError };
  }

  const customerName = input.customerName.trim();
  const customerEmail = normalizeStockNotificationEmail(input.customerEmail);

  const { data: existing } = await db
    .from("out_of_stock_requests")
    .select("id")
    .eq("product_id", input.productId)
    .eq("customer_email", customerEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      code: "duplicate",
      message: "You've already requested this notification."
    };
  }

  const { data, error } = await db
    .from("out_of_stock_requests")
    .insert({
      product_id: input.productId,
      product_name: input.productName.trim(),
      customer_name: customerName,
      customer_email: customerEmail,
      user_id: input.userId ?? null,
      status: "pending"
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "You've already requested this notification."
      };
    }
    return {
      ok: false,
      code: "db",
      message: "Something went wrong. Please try again."
    };
  }

  return { ok: true, id: data.id };
}
