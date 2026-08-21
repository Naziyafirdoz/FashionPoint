import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getRazorpayPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  return key || null;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpay() && getRazorpayPublicKey());
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqualUtf8(expected, params.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualUtf8(expected, signature);
}

export type RazorpayPaymentSnapshot = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
  refund_status: string | null;
  amount_refunded: number;
};

export type RazorpayRefundSnapshot = {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processed" | "failed" | string;
};

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentSnapshot | null> {
  const razorpay = getRazorpay();
  if (!razorpay) return null;

  const payment = (await razorpay.payments.fetch(paymentId)) as {
    id?: string;
    order_id?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    captured?: boolean | string;
    refund_status?: string | null;
    amount_refunded?: number | string;
  };

  if (!payment?.id || !payment.order_id) return null;

  return {
    id: String(payment.id),
    order_id: String(payment.order_id),
    amount: Number(payment.amount),
    currency: String(payment.currency ?? "INR"),
    status: String(payment.status ?? ""),
    captured: payment.captured === true || payment.captured === "true" || payment.status === "captured",
    refund_status: payment.refund_status == null || payment.refund_status === "null"
      ? null
      : String(payment.refund_status),
    amount_refunded: Number(payment.amount_refunded ?? 0)
  };
}

function razorpayAuthHeader(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function razorpayErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: { description?: string; code?: string } }).error;
    const description = error?.description?.trim();
    if (description) return description;
  }
  return fallback;
}

export async function fetchRazorpayRefund(
  refundId: string
): Promise<RazorpayRefundSnapshot | null> {
  const razorpay = getRazorpay();
  if (!razorpay) return null;
  const refund = (await razorpay.refunds.fetch(refundId)) as {
    id?: string;
    payment_id?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
  };
  if (!refund?.id || !refund.payment_id) return null;
  return {
    id: String(refund.id),
    payment_id: String(refund.payment_id),
    amount: Number(refund.amount),
    currency: String(refund.currency ?? "INR"),
    status: String(refund.status ?? "")
  };
}

export async function fetchRazorpayRefundsForPayment(
  paymentId: string
): Promise<RazorpayRefundSnapshot[]> {
  const razorpay = getRazorpay();
  if (!razorpay) return [];
  const result = (await razorpay.payments.fetchMultipleRefund(paymentId)) as {
    items?: Array<{
      id?: string;
      payment_id?: string;
      amount?: number | string;
      currency?: string;
      status?: string;
    }>;
  };
  return (result.items ?? [])
    .filter((item) => item?.id && item.payment_id)
    .map((item) => ({
      id: String(item.id),
      payment_id: String(item.payment_id),
      amount: Number(item.amount),
      currency: String(item.currency ?? "INR"),
      status: String(item.status ?? "")
    }));
}

/**
 * Create a normal refund against a captured Razorpay payment.
 * Uses X-Refund-Idempotency so retries of the same order refund do not create duplicates.
 */
export async function createRazorpayPaymentRefund(input: {
  paymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  receipt?: string;
}): Promise<{ ok: true; refund: RazorpayRefundSnapshot } | { ok: false; error: string }> {
  const auth = razorpayAuthHeader();
  if (!auth) {
    return { ok: false, error: "Razorpay is not configured." };
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      "X-Refund-Idempotency": input.idempotencyKey
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      speed: "normal",
      receipt: input.receipt ?? null
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        payment_id?: string;
        amount?: number | string;
        currency?: string;
        status?: string;
        error?: { description?: string };
      }
    | null;

  if (!response.ok || !payload?.id) {
    return {
      ok: false,
      error: razorpayErrorMessage(payload, "Razorpay could not create the refund.")
    };
  }

  return {
    ok: true,
    refund: {
      id: String(payload.id),
      payment_id: String(payload.payment_id ?? input.paymentId),
      amount: Number(payload.amount ?? input.amountPaise),
      currency: String(payload.currency ?? "INR"),
      status: String(payload.status ?? "")
    }
  };
}
