"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import {
  isAllowedCheckoutPaymentMethod,
  razorpayCheckoutDisplayOptions
} from "@/lib/checkout/payment-methods";

function redirectWith(redirect: string, params: Record<string, string>) {
  const url = new URL(redirect);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  window.location.href = url.toString();
}

function MobileCheckoutPay({ storeName }: { storeName: string }) {
  const params = useSearchParams();
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = useCallback(() => {
    const key = params.get("key") ?? "";
    const orderId = params.get("order_id") ?? "";
    const amount = Number(params.get("amount") ?? 0);
    const name = params.get("name") ?? "";
    const email = params.get("email") ?? "";
    const phone = params.get("phone") ?? "";
    const method = params.get("method") ?? "upi";
    const redirect = params.get("redirect") ?? "";

    if (!key || !orderId || !redirect) {
      setError("Payment session is incomplete. Return to the app and try again.");
      return;
    }
    if (typeof window.Razorpay !== "function") {
      setError("Payment is still loading. Please wait a moment.");
      return;
    }

    const payment = isAllowedCheckoutPaymentMethod(method) ? method : "upi";
    const display = razorpayCheckoutDisplayOptions(payment);
    const rzp = new window.Razorpay({
      key,
      amount,
      currency: "INR",
      name: storeName,
      order_id: orderId,
      method: display.method,
      config: display.config,
      prefill: {
        name,
        email,
        contact: phone,
        method: display.prefillMethod
      },
      handler: (response: Record<string, string>) => {
        redirectWith(redirect, {
          razorpay_payment_id: String(response.razorpay_payment_id ?? ""),
          razorpay_order_id: String(response.razorpay_order_id ?? ""),
          razorpay_signature: String(response.razorpay_signature ?? "")
        });
      }
    });

    rzp.on("payment.failed", () => {
      redirectWith(redirect, { error: "payment_failed" });
    });
    rzp.open();
  }, [params, storeName]);

  useEffect(() => {
    if (!scriptReady) return;
    openCheckout();
  }, [openCheckout, scriptReady]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFBF9] px-6 py-16 text-center">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
      />
      <p className="font-[family-name:var(--font-display)] text-2xl text-primary">{storeName}</p>
      <p className="mt-3 max-w-sm text-sm text-foreground/70">
        {error ?? "Opening secure payment… If the checkout window does not appear, tap Pay now."}
      </p>
      {error ? null : (
        <button
          type="button"
          onClick={openCheckout}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white"
        >
          Pay now
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          const redirect = params.get("redirect");
          if (redirect) redirectWith(redirect, { cancelled: "1" });
        }}
        className="mt-4 text-sm font-medium text-primary"
      >
        Return to app
      </button>
    </main>
  );
}

export function MobileCheckoutClient({ storeName }: { storeName: string }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#FFFBF9]" />}>
      <MobileCheckoutPay storeName={storeName} />
    </Suspense>
  );
}
