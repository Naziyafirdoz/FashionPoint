import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { StackHeader } from "@/components/navigation/StackHeader";
import { Field, PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { fetchCustomerAddresses, type AddressRecord } from "@/lib/account";
import { API_ORIGIN, apiFetch, toUserMessage } from "@/lib/api";
import { formatInr } from "@/lib/catalog";
import { useAuth } from "@/providers/AuthProvider";
import { useCart, type CartItem } from "@/providers/CartProvider";

type ShippingQuote = {
  shippingAmount: number;
  message?: string;
};

const PAYMENT_METHODS = [
  { id: "upi", title: "UPI Payment" },
  { id: "card", title: "Credit / Debit Card" },
  { id: "netbanking", title: "Net Banking" },
] as const;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const isBuyNow = mode === "buy_now";
  const items: CartItem[] = isBuyNow ? cart.buyNowItems ?? [] : cart.items;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [house, setHouse] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("upi");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [saved, setSaved] = useState<AddressRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    void fetchCustomerAddresses()
      .then((addresses) => {
        setSaved(addresses);
        const preferred = addresses.find((row) => row.is_default) ?? addresses[0];
        if (preferred) applySaved(preferred);
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    const pin = pincode.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setQuote(null);
      setCity("");
      setState("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const looked = await apiFetch<{ city: string; state: string; pincode: string }>(
          `/api/pincode/${pin}`,
          { auth: "none" }
        );
        if (cancelled) return;
        setCity(looked.city);
        setState(looked.state);
        const line = [house, street, landmark].filter(Boolean).join(", ");
        const quoted = await apiFetch<{ quote: ShippingQuote }>("/api/shipping/quote", {
          method: "POST",
          auth: "none",
          body: JSON.stringify({
            city: looked.city,
            state: looked.state,
            pincode: looked.pincode,
            line,
          }),
        });
        if (!cancelled) setQuote(quoted.quote);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setError(toUserMessage(err, "Could not validate this pincode."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pincode, house, street, landmark]);

  const applySaved = (address: AddressRecord) => {
    setName(address.name ?? "");
    setPhone(address.phone ?? "");
    setHouse(address.line1 ?? "");
    setStreet(address.line2 ?? "");
    setPincode(address.pincode ?? "");
    setCity(address.city ?? "");
    setState(address.state ?? "");
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingAmount = quote?.shippingAmount ?? 0;
  const total = Math.max(0, subtotal + shippingAmount - cart.discount);

  const orderAddress = useMemo(() => {
    const line = [house.trim(), street.trim(), landmark.trim()].filter(Boolean).join(", ");
    return {
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim(),
      house_flat: house.trim(),
      street: street.trim(),
      landmark: landmark.trim(),
      line,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.replace(/\D/g, "").slice(0, 6),
    };
  }, [name, phone, email, house, street, landmark, city, state, pincode]);

  const placeOrder = async () => {
    setError(null);
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(isBuyNow ? "/checkout?mode=buy_now" : "/checkout")}` as Href);
      return;
    }
    if (!isValidName(name)) {
      setError("Enter your full name (first and last name).");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(normalizePhone(phone))) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!house.trim() || !street.trim() || orderAddress.pincode.length !== 6 || !city || !quote) {
      setError("Please complete a valid delivery address.");
      return;
    }
    if (items.length === 0) {
      setError("Your bag is empty.");
      return;
    }

    setBusy(true);
    try {
      const created = await apiFetch<{
        orderId: string;
        orderNumber: string;
        razorpayOrderId: string;
        key: string;
        amount: number;
      }>("/api/orders/create", {
        method: "POST",
        auth: "required",
        body: JSON.stringify({
          items,
          address: orderAddress,
          payment,
          subtotal,
          discount: cart.discount,
          shipping_amount: shippingAmount,
          total,
        }),
      });

      const redirect = Linking.createURL("payment-return");
      const payUrl = `${API_ORIGIN}/checkout/mobile?${new URLSearchParams({
        key: created.key,
        order_id: created.razorpayOrderId,
        amount: String(created.amount),
        name: orderAddress.name,
        email: orderAddress.email,
        phone: orderAddress.phone,
        method: payment,
        redirect,
      }).toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(payUrl, redirect);
      if (result.type !== "success" || !("url" in result) || !result.url) {
        setError("Payment was cancelled. Your order is saved as pending until payment is completed.");
        return;
      }

      const returned = new URL(result.url);
      if (returned.searchParams.get("error") || returned.searchParams.get("cancelled")) {
        setError("Payment failed or was cancelled. You can retry from My Orders if needed.");
        return;
      }

      const paymentId = returned.searchParams.get("razorpay_payment_id");
      const orderId = returned.searchParams.get("razorpay_order_id");
      const signature = returned.searchParams.get("razorpay_signature");
      if (!paymentId || !orderId || !signature) {
        setError("Payment could not be verified. Please contact support if money was deducted.");
        return;
      }

      const verified = await apiFetch<{ orderNumber?: string }>("/api/payment/verify", {
        method: "POST",
        auth: "required",
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
        }),
      });

      if (isBuyNow) cart.clearBuyNow();
      else cart.clearCart();
      router.replace(`/order-success/${encodeURIComponent(verified.orderNumber ?? created.orderNumber)}` as Href);
    } catch (err) {
      setError(toUserMessage(err, "Could not complete checkout."));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <StackHeader title="Checkout" />
          <StatusMessage message="Preparing checkout…" />
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <StackHeader title="Checkout" />
          <StatusMessage
            title="Sign in required"
            message="Please sign in to place your order."
            actionLabel="Sign in"
            onAction={() =>
              router.push(
                `/login?redirect=${encodeURIComponent(isBuyNow ? "/checkout?mode=buy_now" : "/checkout")}` as Href
              )
            }
          />
        </SafeAreaView>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <StackHeader title="Checkout" />
          <StatusMessage
            title="Nothing to checkout"
            message="Your bag is empty."
            actionLabel="Continue shopping"
            onAction={() => router.push("/shop" as Href)}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Checkout" />
          <ScrollView contentContainerStyle={styles.body}>
            {saved.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.heading}>Saved addresses</Text>
                {saved.map((address) => (
                  <Pressable key={address.id} onPress={() => applySaved(address)} style={styles.saved}>
                    <Text style={styles.savedTitle}>{address.name}</Text>
                    <Text style={styles.savedMeta}>
                      {address.line1}, {address.city} {address.pincode}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.block}>
              <Text style={styles.heading}>Delivery address</Text>
              <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field label="House / flat" value={house} onChangeText={setHouse} />
              <Field label="Street" value={street} onChangeText={setStreet} />
              <Field label="Landmark" value={landmark} onChangeText={setLandmark} />
              <Field label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
              <Field label="City" value={city} onChangeText={setCity} editable={false} />
              <Field label="State" value={state} onChangeText={setState} editable={false} />
            </View>

            <View style={styles.block}>
              <Text style={styles.heading}>Payment</Text>
              {PAYMENT_METHODS.map((method) => (
                <Pressable
                  key={method.id}
                  onPress={() => setPayment(method.id)}
                  style={[styles.pay, payment === method.id ? styles.payActive : null]}
                >
                  <Text style={[styles.payText, payment === method.id ? styles.payTextActive : null]}>
                    {method.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.block}>
              <Text style={styles.heading}>Order summary</Text>
              {items.map((item) => (
                <Text key={`${item.productId}-${item.size}-${item.color}`} style={styles.item}>
                  {item.name} · {item.size} · {item.quantity} × {formatInr(item.price)}
                </Text>
              ))}
              <Text style={styles.item}>Subtotal {formatInr(subtotal)}</Text>
              <Text style={styles.item}>Shipping {quote ? formatInr(shippingAmount) : "calculated after pincode"}</Text>
              <Text style={styles.total}>Total {formatInr(total)}</Text>
              {quote?.message ? <Text style={styles.note}>{quote.message}</Text> : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={busy ? "Processing..." : "Pay now"}
              onPress={() => void placeOrder()}
              disabled={busy}
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  block: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 14,
    gap: 10,
  },
  heading: { fontFamily: Brand.displayFont, fontSize: 20, color: Brand.maroon },
  saved: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Brand.blushBorder },
  savedTitle: { fontWeight: "700", color: Brand.ink },
  savedMeta: { color: Brand.muted, fontSize: 13 },
  pay: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    padding: 12,
  },
  payActive: { borderColor: Brand.maroon, backgroundColor: Brand.blush },
  payText: { color: Brand.ink, fontWeight: "600" },
  payTextActive: { color: Brand.maroon },
  item: { color: Brand.muted, fontSize: 13 },
  total: { fontWeight: "800", color: Brand.maroon, fontSize: 16 },
  note: { color: Brand.muted, fontSize: 12 },
  error: { color: "#9B1C1C" },
});
