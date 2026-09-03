"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import toast from "react-hot-toast";
import { CHECKOUT_PAYMENT_METHODS, paymentMethodLabel, type PaymentMethodId } from "@/lib/checkout/payment-methods";
import { computeCheckoutTotals } from "@/lib/checkout/totals";
import { STORE_NAME } from "@/lib/site-config";
import { useCheckoutSession } from "@/stores/checkout-session";
import { useCartStore } from "@/stores/cart";
import type { CartItem } from "@/types";
import { FinalSalePolicyNotice } from "@/components/store/FinalSalePolicyNotice";
import { AddressValidationModal } from "@/components/store/AddressValidationModal";
import { ShippingChargesInfo } from "@/components/store/ShippingChargesInfo";
import {
  validateCheckoutStep1,
  type CheckoutStep1Field
} from "@/lib/checkout/step1-validation";
import { validateAddressLocation } from "@/lib/shipping/address-validation";
import { normalizePincode } from "@/lib/shipping/pincode-lookup";
import { buildOrderAddressPayload, composeAddressLine } from "@/lib/delivery/location";
import { addressToCheckoutAddress } from "@/lib/checkout/saved-addresses";
import { saveCheckoutAddressAction } from "@/app/(store)/checkout/actions";
import type { ShippingQuote } from "@/lib/shipping/rates";
import type { Address } from "@/types";

export type CheckoutAddress = {
  name: string;
  phone: string;
  secondary_phone: string;
  email: string;
  house_flat: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

type CheckoutFormProps = {
  initialAddress?: Partial<CheckoutAddress> & { line?: string };
  savedAddresses?: Address[];
  checkoutMode?: "cart" | "buy_now";
  storeName?: string;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

function emptyAddress(initial?: CheckoutFormProps["initialAddress"]): CheckoutAddress {
  const legacyLine = initial?.line?.trim() ?? "";
  return {
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    secondary_phone: initial?.secondary_phone ?? "",
    email: initial?.email ?? "",
    house_flat: initial?.house_flat ?? "",
    street: initial?.street ?? legacyLine,
    landmark: initial?.landmark ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? ""
  };
}

function successUrl(orderNumber: string | undefined) {
  return orderNumber ? `/order-success/${encodeURIComponent(orderNumber)}` : "/order-success";
}

function hasMinimumAddress(address: CheckoutAddress, pincodeValidated: boolean): boolean {
  return validateCheckoutStep1({ address, pincodeValidated }).length === 0;
}

function fieldClassName(invalid: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm ${
    invalid
      ? "border-red-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
      : "border-accent/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
  }`;
}

function readOnlyClassName() {
  return "w-full rounded-lg border border-primary/10 bg-blush/40 px-3 py-2 text-sm text-foreground/80";
}

async function fetchAuthoritativeShippingQuote(input: {
  city: string;
  state: string;
  pincode: string;
  line: string;
}): Promise<ShippingQuote> {
  const response = await fetch("/api/shipping/quote", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = (await response.json().catch(() => ({}))) as {
    quote?: ShippingQuote;
    error?: string;
  };
  if (!response.ok || !data.quote) {
    throw new Error(data.error ?? "Could not calculate shipping for this address");
  }
  return data.quote;
}

function InlineFieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs text-red-600">⚠ {message}</p>;
}

type FieldShellProps = {
  field: CheckoutStep1Field;
  label?: string;
  error?: string;
  showError: boolean;
  registerRef: (field: CheckoutStep1Field, el: HTMLElement | null) => void;
  children: React.ReactNode;
};

function FieldShell({ field, label, error, showError, registerRef, children }: FieldShellProps) {
  const invalid = showError && Boolean(error);
  return (
    <div ref={(el) => registerRef(field, el)}>
      {label ? <p className="mb-1 text-sm font-medium text-foreground">{label}</p> : null}
      {children}
      {invalid && error ? <InlineFieldError message={error} /> : null}
    </div>
  );
}

function Step1ErrorSummary({
  errors
}: {
  errors: { field: CheckoutStep1Field; summaryLabel: string }[];
}) {
  if (errors.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      role="alert"
    >
      <p className="font-medium">Please complete the required fields before continuing.</p>
      <p className="mt-2 font-medium">Missing:</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5">
        {errors.map((error) => (
          <li key={error.field}>{error.summaryLabel}</li>
        ))}
      </ul>
    </div>
  );
}

export function CheckoutForm({
  initialAddress,
  savedAddresses = [],
  checkoutMode = "cart",
  storeName = STORE_NAME
}: CheckoutFormProps) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState<CheckoutAddress>(() => emptyAddress(initialAddress));
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">(
    savedAddresses[0]?.id ?? "new"
  );
  const [saveAddress, setSaveAddress] = useState(false);
  const [payment, setPayment] = useState<PaymentMethodId>("upi");
  const [pincodeValidated, setPincodeValidated] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showStep1Errors, setShowStep1Errors] = useState(false);
  const fieldRefs = useRef<Partial<Record<CheckoutStep1Field, HTMLElement | null>>>({});
  const [validationModal, setValidationModal] = useState<{
    entered: { city: string; state: string; pincode: string };
    detected: { city: string; state: string } | null;
  } | null>(null);

  const cart = useCartStore();
  const buyNowItem = useCheckoutSession((s) => s.buyNowItem);
  const endCheckoutSession = useCheckoutSession((s) => s.endSession);

  const isBuyNow = checkoutMode === "buy_now" && buyNowItem != null;
  const items: CartItem[] = useMemo(
    () => (isBuyNow && buyNowItem ? [buyNowItem] : cart.items),
    [isBuyNow, buyNowItem, cart.items]
  );
  const discount = isBuyNow ? 0 : cart.discount;

  const step1Errors = useMemo(() => {
    if (!showStep1Errors) return [];
    return validateCheckoutStep1({ address, pincodeValidated });
  }, [showStep1Errors, address, pincodeValidated]);

  const step1ErrorMap = useMemo(() => {
    const map: Partial<Record<CheckoutStep1Field, string>> = {};
    for (const error of step1Errors) {
      if (!map[error.field]) map[error.field] = error.message;
    }
    return map;
  }, [step1Errors]);

  const registerFieldRef = (field: CheckoutStep1Field, el: HTMLElement | null) => {
    fieldRefs.current[field] = el;
  };

  const addressReady = hasMinimumAddress(address, pincodeValidated);
  const orderAddress = useMemo(
    () =>
      buildOrderAddressPayload(
        {
          name: address.name,
          phone: address.phone,
          secondary_phone: address.secondary_phone,
          email: address.email
        },
        address
      ),
    [address]
  );

  const totals = useMemo(
    () => computeCheckoutTotals(items, discount, addressReady ? shippingQuote : null),
    [items, discount, addressReady, shippingQuote]
  );

  useEffect(() => {
    const pincode = normalizePincode(address.pincode);
    if (pincode.length !== 6) {
      setPincodeValidated(false);
      setShippingQuote(null);
      setAddress((prev) => ({ ...prev, city: "", state: "" }));
      return;
    }

    let cancelled = false;
    setPincodeLoading(true);

    void fetch(`/api/pincode/${pincode}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setPincodeValidated(false);
          setShippingQuote(null);
          setAddress((prev) => ({ ...prev, city: "", state: "" }));
          return;
        }
        const data = (await res.json()) as { city: string; state: string; pincode: string };
        setAddress((prev) => ({
          ...prev,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        }));
        setPincodeValidated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPincodeValidated(false);
          setShippingQuote(null);
          setAddress((prev) => ({ ...prev, city: "", state: "" }));
        }
      })
      .finally(() => {
        if (!cancelled) setPincodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address.pincode]);

  const focusFirstStep1Error = (errors: ReturnType<typeof validateCheckoutStep1>) => {
    const first = errors[0];
    if (!first) return;
    const container = fieldRefs.current[first.field];
    container?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = container?.querySelector<HTMLElement>(
      "input, textarea, button, select, [tabindex]:not([tabindex='-1'])"
    );
    focusable?.focus();
  };

  const handleContinue = async () => {
    setShowStep1Errors(true);
    const errors = validateCheckoutStep1({ address, pincodeValidated });
    if (errors.length > 0) {
      focusFirstStep1Error(errors);
      return;
    }

    setContinuing(true);
    try {
      const validation = await validateAddressLocation({
        city: address.city,
        state: address.state,
        pincode: address.pincode
      });

      if (!validation.ok) {
        setValidationModal({
          entered: validation.entered,
          detected: validation.detected
        });
        return;
      }

      const validatedAddress = {
        ...address,
        city: validation.city,
        state: validation.state,
        pincode: validation.pincode
      };
      const quote = await fetchAuthoritativeShippingQuote({
        city: validatedAddress.city,
        state: validatedAddress.state,
        pincode: validatedAddress.pincode,
        line: composeAddressLine({
          house_flat: validatedAddress.house_flat,
          street: validatedAddress.street,
          landmark: validatedAddress.landmark
        })
      });
      setAddress(validatedAddress);
      setPincodeValidated(true);
      setShippingQuote(quote);
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not calculate shipping");
    } finally {
      setContinuing(false);
    }
  };

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const saved = savedAddresses.find((item) => item.id === addressId);
    if (!saved) return;
    setAddress(addressToCheckoutAddress(saved, address.email || initialAddress?.email || ""));
    setShippingQuote(null);
    setShowStep1Errors(false);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId("new");
    setAddress((prev) => ({
      ...emptyAddress(initialAddress),
      email: prev.email || initialAddress?.email || ""
    }));
    setShippingQuote(null);
    setShowStep1Errors(false);
  };

  const placeOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!addressReady) {
      toast.error("Please enter a complete delivery address");
      return;
    }
    if (totals.subtotal <= 0) {
      toast.error("Order subtotal must be greater than zero");
      return;
    }
    if (!shippingQuote) {
      toast.error("Please continue to confirm shipping for this address");
      return;
    }

    setPlacingOrder(true);

    try {
      if (saveAddress && selectedAddressId === "new") {
        const saveResult = await saveCheckoutAddressAction({
          name: address.name,
          phone: address.phone,
          house_flat: address.house_flat,
          street: address.street,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          pincode: address.pincode
        });
        if (saveResult?.error) {
          toast.error(saveResult.error);
          return;
        }
      }

      const { subtotal, shippingAmount, total } = totals;

      const createRes = await fetch("/api/orders/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          address: orderAddress,
          payment,
          subtotal,
          discount,
          shipping_amount: shippingAmount,
          total
        })
      });

      const data = await createRes.json();

      if (createRes.status === 401) {
        toast.error("Please sign in to place an order");
        window.location.href = `/login?redirect=${encodeURIComponent(isBuyNow ? "/checkout?mode=buy_now" : "/checkout")}`;
        return;
      }

      if (!createRes.ok) {
        toast.error(data.error ?? "Could not start checkout");
        return;
      }

      const orderNumber = data.orderNumber as string;
      const orderId = data.orderId as string;

      const finishCheckout = () => {
        if (isBuyNow) {
          endCheckoutSession();
        } else {
          cart.clearCart();
        }
      };

      const completeOrder = async (verifyBody: Record<string, unknown>) => {
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyBody)
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          toast.error(verifyData.error ?? "Payment verification failed");
          if (orderNumber) {
            window.location.href = `/checkout/payment-failed?order=${encodeURIComponent(orderNumber)}&reason=${encodeURIComponent(verifyData.error ?? "Verification failed")}`;
          }
          return false;
        }
        toast.success("Payment successful!");
        finishCheckout();
        window.location.href = successUrl(verifyData.orderNumber ?? orderNumber);
        return true;
      };

      if (data.demo) {
        await completeOrder({ demo: true, orderId });
        return;
      }

      const { razorpayOrderId, key, amount: amt } = data;
      if (!razorpayOrderId || !key) {
        toast.error("Payment not configured");
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount: amt,
        currency: "INR",
        name: storeName.trim() || STORE_NAME,
        order_id: razorpayOrderId,
        prefill: {
          name: address.name,
          email: address.email,
          contact: address.phone
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await completeOrder(response);
        },
        modal: {
          ondismiss: () => {
            window.location.href = `/checkout/payment-cancelled?order=${encodeURIComponent(orderNumber)}`;
          }
        }
      });

      rzp.on("payment.failed", (response) => {
        const error = response.error as { description?: string } | undefined;
        const description = error?.description ?? "Payment could not be completed";
        void fetch("/api/payment/mark-failed", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, reason: description })
        });
        window.location.href = `/checkout/payment-failed?order=${encodeURIComponent(orderNumber)}&reason=${encodeURIComponent(description)}`;
      });

      rzp.open();
    } finally {
      setPlacingOrder(false);
    }
  };

  if (checkoutMode === "buy_now" && !buyNowItem) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-display text-2xl font-bold text-primary">Checkout</h1>
        <p className="mt-4 text-sm text-foreground/70">
          Your Buy Now session expired. Please select a product again.
        </p>
        <Link href="/products" className="btn-primary mt-6 inline-block">
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-display text-2xl font-bold text-primary">Checkout</h1>
        <p className="mt-4 text-sm text-foreground/70">Your cart is empty.</p>
        <Link href="/products" className="btn-primary mt-6 inline-block">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-primary">Checkout</h1>
        {isBuyNow ? (
          <p className="mt-2 text-sm text-foreground/60">
            Buy Now — checking out {items.length} item. Your cart is unchanged.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {["Address", "Payment", "Review"].map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-primary text-white" : "bg-blush text-foreground/70"}`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <form
            noValidate
            className="card-store mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleContinue();
            }}
          >
            <p className="font-semibold">Step 1 — Delivery Address</p>

            {savedAddresses.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground/80">Saved addresses</p>
                {savedAddresses.map((saved) => {
                  const line = [saved.line1, saved.line2, saved.city, saved.state, saved.pincode]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <label
                      key={saved.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selectedAddressId === saved.id
                          ? "border-primary bg-blush/30 ring-1 ring-primary/20"
                          : "border-accent/20 hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        className="mt-1"
                        checked={selectedAddressId === saved.id}
                        onChange={() => handleSelectSavedAddress(saved.id)}
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-foreground">
                          {saved.label ?? "Address"} · {saved.name}
                        </p>
                        <p className="mt-0.5 text-foreground/60">{line}</p>
                      </div>
                    </label>
                  );
                })}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selectedAddressId === "new"
                      ? "border-primary bg-blush/30 ring-1 ring-primary/20"
                      : "border-accent/20 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved-address"
                    checked={selectedAddressId === "new"}
                    onChange={handleUseNewAddress}
                  />
                  <span className="text-sm font-medium">Use a new address</span>
                </label>
              </div>
            ) : null}

            <FieldShell
              field="name"
              error={step1ErrorMap.name}
              showError={showStep1Errors}
              registerRef={registerFieldRef}
            >
              <input
                type="text"
                placeholder="Full Name *"
                value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })}
                className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.name))}
              />
            </FieldShell>

            <FieldShell
              field="phone"
              error={step1ErrorMap.phone}
              showError={showStep1Errors}
              registerRef={registerFieldRef}
            >
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Primary Mobile Number *"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.phone))}
              />
            </FieldShell>

            <FieldShell
              field="secondary_phone"
              error={step1ErrorMap.secondary_phone}
              showError={showStep1Errors}
              registerRef={registerFieldRef}
            >
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Secondary Mobile Number (Optional)"
                value={address.secondary_phone}
                onChange={(e) => setAddress({ ...address, secondary_phone: e.target.value })}
                className={fieldClassName(
                  showStep1Errors && Boolean(step1ErrorMap.secondary_phone)
                )}
              />
            </FieldShell>

            <FieldShell
              field="email"
              error={step1ErrorMap.email}
              showError={showStep1Errors}
              registerRef={registerFieldRef}
            >
              <input
                type="email"
                placeholder="Email *"
                value={address.email}
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
                className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.email))}
              />
            </FieldShell>

            <div className="border-t border-accent/20 pt-4">
              <p className="font-semibold text-foreground">Delivery Address</p>

              <div className="mt-3 space-y-3">
                <FieldShell
                  field="house_flat"
                  error={step1ErrorMap.house_flat}
                  showError={showStep1Errors}
                  registerRef={registerFieldRef}
                >
                  <input
                    type="text"
                    placeholder="Door / House / Flat Number *"
                    value={address.house_flat}
                    onChange={(e) => setAddress({ ...address, house_flat: e.target.value })}
                    className={fieldClassName(
                      showStep1Errors && Boolean(step1ErrorMap.house_flat)
                    )}
                  />
                </FieldShell>
                <FieldShell
                  field="street"
                  error={step1ErrorMap.street}
                  showError={showStep1Errors}
                  registerRef={registerFieldRef}
                >
                  <input
                    type="text"
                    placeholder="Street / Area *"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.street))}
                  />
                </FieldShell>
                <FieldShell
                  field="landmark"
                  error={step1ErrorMap.landmark}
                  showError={showStep1Errors}
                  registerRef={registerFieldRef}
                >
                  <input
                    type="text"
                    placeholder="Landmark *"
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                    className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.landmark))}
                  />
                </FieldShell>
                <FieldShell
                  field="pincode"
                  error={step1ErrorMap.pincode}
                  showError={showStep1Errors}
                  registerRef={registerFieldRef}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Pincode *"
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({ ...address, pincode: normalizePincode(e.target.value) })
                    }
                    className={fieldClassName(showStep1Errors && Boolean(step1ErrorMap.pincode))}
                  />
                </FieldShell>
                {pincodeLoading ? (
                  <p className="text-xs text-foreground/50">Looking up city and state…</p>
                ) : null}
                <input
                  type="text"
                  placeholder="City"
                  value={address.city}
                  readOnly
                  className={readOnlyClassName()}
                  aria-readonly="true"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={address.state}
                  readOnly
                  className={readOnlyClassName()}
                  aria-readonly="true"
                />
                <p className="text-xs text-foreground/50">
                  City and State are filled automatically from your pincode.
                </p>
              </div>
            </div>

            {totals.quote ? (
              <ShippingChargesInfo quote={totals.quote} />
            ) : (
              <ShippingChargesInfo />
            )}

            <Step1ErrorSummary errors={step1Errors} />

            {selectedAddressId === "new" ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="rounded border-accent/40"
                />
                Save this address to my account
              </label>
            ) : null}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={continuing || pincodeLoading}
            >
              {continuing ? "Validating…" : "Continue"}
            </button>
          </form>
        )}

        <AddressValidationModal
          open={validationModal != null}
          entered={validationModal?.entered ?? { city: "", state: "", pincode: "" }}
          detected={validationModal?.detected ?? null}
          onClose={() => setValidationModal(null)}
        />

        {step === 2 && (
          <div className="card-store mt-6 space-y-3">
            <p className="font-semibold">Step 2 — Payment</p>
            <div className="space-y-2">
              {CHECKOUT_PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    payment === method.id
                      ? "border-primary bg-blush/30 ring-1 ring-primary/20"
                      : "border-accent/20 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="pay"
                    className="mt-1"
                    checked={payment === method.id}
                    onChange={() => setPayment(method.id)}
                  />
                  <div>
                    <p className="font-medium text-foreground">{method.title}</p>
                    {method.description ? (
                      <p className="mt-0.5 text-xs text-foreground/60">{method.description}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setStep(3)} className="btn-primary w-full">
              Review Order
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="card-store mt-6 space-y-6">
            <p className="font-semibold">Step 3 — Review &amp; Place Order</p>

            <section>
              <h3 className="text-sm font-semibold text-foreground/70">Customer</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Name</dt>
                  <dd>{address.name || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Primary Phone</dt>
                  <dd>{address.phone || "—"}</dd>
                </div>
                {address.secondary_phone ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-foreground/60">Secondary Phone</dt>
                    <dd>{address.secondary_phone}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Email</dt>
                  <dd>{address.email || "—"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground/70">Delivery Address</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">House/Flat</dt>
                  <dd className="text-right">{address.house_flat || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Street/Area</dt>
                  <dd className="text-right">{address.street || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Landmark</dt>
                  <dd className="text-right">{address.landmark || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">City</dt>
                  <dd>{address.city || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">State</dt>
                  <dd>{address.state || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/60">Pincode</dt>
                  <dd>{address.pincode || "—"}</dd>
                </div>
              </dl>
              {totals.quote?.tier === "local" ? (
                <p className="mt-3 text-sm text-foreground/70">
                  <span className="font-medium text-foreground">Estimated Delivery:</span>{" "}
                  Approximately 2 days
                </p>
              ) : null}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground/70">Items</h3>
              <ul className="mt-3 space-y-3">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="flex gap-3 rounded-lg border bg-blush/20 p-3"
                  >
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-blush">
                      {item.image ? (
                        <Image src={item.image} alt="" fill className="object-cover" sizes="48px" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="mt-1 text-xs text-foreground/60">
                        Size: {item.size} · Color: {item.color} · Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground/70">Pricing</h3>
              <ShippingChargesInfo quote={totals.quote} className="mt-3" />
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-foreground/60">Products Total</dt>
                  <dd>₹{totals.subtotal.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/60">Shipping</dt>
                  <dd>₹{totals.shippingAmount.toLocaleString("en-IN")}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-green-700">
                    <dt>Discount</dt>
                    <dd>-₹{discount.toLocaleString("en-IN")}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 font-bold">
                  <dt>Grand Total</dt>
                  <dd>₹{totals.total.toLocaleString("en-IN")}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground/70">Payment Method</h3>
              <p className="mt-2 text-sm">{paymentMethodLabel(payment)}</p>
              <p className="mt-1 text-xs text-foreground/50">
                You will complete payment securely via Razorpay (UPI, cards, net banking).
              </p>
            </section>

            <section className="text-sm text-foreground/70">
              <p>
                By placing this order you agree to our{" "}
                <Link href="/terms-and-conditions" className="text-primary underline" target="_blank">
                  Terms &amp; Conditions
                </Link>
                ,{" "}
                <Link href="/shipping-policy" className="text-primary underline" target="_blank">
                  Shipping Policy
                </Link>
                , and{" "}
                <Link href="/return-policy" className="text-primary underline" target="_blank">
                  Return Policy
                </Link>
                .
              </p>
            </section>

            <FinalSalePolicyNotice variant="checkout" />

            <button
              type="button"
              onClick={placeOrder}
              disabled={placingOrder}
              className="btn-primary w-full disabled:opacity-60"
            >
              {placingOrder ? "Processing…" : "PLACE ORDER"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
