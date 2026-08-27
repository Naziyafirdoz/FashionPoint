import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { CancelOrderModal } from "@/components/account/CancelOrderModal";
import { CustomerCancelledOrderSection } from "@/components/account/CustomerCancelledOrderSection";
import { Field, PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import {
  CUSTOMER_ORDER_STATUS_MESSAGE,
  canCustomerCancelOrder,
  fetchCustomerOrderById,
  formatOrderDateTime,
  formatOrderStatus,
  formatPaymentMethod,
  formatPaymentStatus,
  getOrderItemProductId,
  orderIsPrepaidForCancel,
  orderStatusBadgePalette,
  paymentMethodBadgePalette,
  paymentStatusBadgePalette,
  resolveRouteId,
  shouldShowOrderProgressMessage,
  submitCustomerOrderCancellation,
  toCancelOrderMessage,
  toOrderLoadMessage,
  type BadgePalette,
  type CustomerOrder,
  type CustomerOrderItem,
} from "@/lib/account";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { formatInr } from "@/lib/catalog";

type UserReview = {
  id: string;
  product_id: string;
  order_id: string | null;
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = resolveRouteId(params.id);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) {
      setLoading(false);
      setError("This order could not be found.");
      return;
    }
    if (!options?.silent) setLoading(true);
    try {
      const [orderData, reviewData] = await Promise.all([
        fetchCustomerOrderById(id),
        apiFetch<{ reviews: UserReview[] }>("/api/reviews?mine=true", { auth: "required" }).catch(
          () => ({ reviews: [] as UserReview[] })
        ),
      ]);
      setOrder(orderData);
      setReviews(reviewData.reviews ?? []);
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setOrder(null);
        setError(toOrderLoadMessage(err, "Unable to load this order."));
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const cancelOrder = () => {
    if (!order) return;
    setError(null);
    setCancelError(null);
    setCancelOpen(true);
  };

  const handleConfirmCancel = async (payload: { cancellation_reason?: string }) => {
    if (!order || cancelling) return;
    setCancelling(true);
    setError(null);
    setCancelError(null);
    try {
      const result = await submitCustomerOrderCancellation(order.id, payload.cancellation_reason);
      if (result.order) {
        setOrder((prev) => {
          if (!prev) return result.order ?? null;
          return {
            ...prev,
            ...result.order!,
            items: result.order!.items.length ? result.order!.items : prev.items,
          };
        });
      }
      setCancelOpen(false);
      setMessage(result.message);
      await load({ silent: true });
    } catch (err) {
      setCancelError(toCancelOrderMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const submitReview = async (item: CustomerOrderItem) => {
    const productId = getOrderItemProductId(item);
    if (!order || !productId) return;
    if (!reviewTitle.trim()) {
      setError("Title is required");
      return;
    }
    if (!reviewBody.trim()) {
      setError("Review text is required");
      return;
    }
    setSavingReview(true);
    setError(null);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        auth: "required",
        body: JSON.stringify({
          product_id: productId,
          order_id: order.id,
          rating,
          title: reviewTitle.trim(),
          body: reviewBody.trim(),
          images: [],
          size_purchased: item.size || null,
          color_purchased: item.color || null,
        }),
      });
      setMessage("Review submitted.");
      setReviewingProductId(null);
      setReviewTitle("");
      setReviewBody("");
      setRating(5);
      await load();
    } catch (err) {
      setError(toOrderLoadMessage(err, "Unable to save review."));
    } finally {
      setSavingReview(false);
    }
  };

  const hasReview = (productId: string) =>
    reviews.some((review) => review.product_id === productId && review.order_id === order?.id);

  const canCancel = order ? canCustomerCancelOrder(order) : false;
  const isDelivered = (order?.status ?? "").toLowerCase() === "delivered";
  const shipping = shippingAddressDisplay(order?.shipping_address);
  const paymentMethod = formatPaymentMethod(order?.payment_method);
  const showProgress = order ? shouldShowOrderProgressMessage(order.status) : false;

  return (
    <AccountStackFrame title="Order details">
      {loading ? (
        <StatusMessage message="Loading your order..." />
      ) : error && !order ? (
        <StatusMessage
          title="Order unavailable"
          message={error}
          actionLabel="My orders"
          onAction={() => router.replace("/orders" as Href)}
        />
      ) : order ? (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          <Text style={styles.section}>Order information</Text>
          <View style={styles.card}>
            <Text style={styles.number}>{order.order_number}</Text>
            <Text style={styles.meta}>{formatOrderDateTime(order.created_at)}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge label={formatOrderStatus(order.status)} palette={orderStatusBadgePalette(order.status)} />
              <StatusBadge
                label={formatPaymentStatus(order.payment_status)}
                palette={paymentStatusBadgePalette(order.payment_status)}
              />
              {paymentMethod ? (
                <StatusBadge label={paymentMethod} palette={paymentMethodBadgePalette()} />
              ) : null}
            </View>
            {showProgress ? <Text style={styles.meta}>{CUSTOMER_ORDER_STATUS_MESSAGE}</Text> : null}
          </View>

          {order ? <CustomerCancelledOrderSection order={order} /> : null}

          <Text style={styles.section}>Items</Text>
          {order.items.length ? (
            order.items.map((item, index) => {
              const productId = getOrderItemProductId(item);
              const reviewing = reviewingProductId === `${productId}-${index}`;
              const image = resolveMediaUrl(item.image);
              return (
                <View key={`${item.name}-${index}`} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.thumb}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.thumbImage} contentFit="cover" />
                      ) : (
                        <Text style={styles.thumbFallback}>—</Text>
                      )}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.item}>Size: {item.size}</Text>
                      <Text style={styles.item}>Color: {item.color}</Text>
                      <Text style={styles.item}>Qty: {item.quantity}</Text>
                      <Text style={styles.item}>Price: {formatInr(item.price)}</Text>
                    </View>
                  </View>
                  {isDelivered && productId ? (
                    hasReview(productId) ? (
                      <Text style={styles.reviewed}>Review Submitted</Text>
                    ) : reviewing ? (
                      <View style={styles.reviewForm}>
                        <Text style={styles.legend}>Write Review</Text>
                        <View style={styles.ratingRow}>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Pressable
                              key={value}
                              onPress={() => setRating(value)}
                              style={[styles.star, rating === value ? styles.starActive : null]}
                            >
                              <Text style={[styles.starText, rating === value ? styles.starTextActive : null]}>
                                {value}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Field label="Title" value={reviewTitle} onChangeText={setReviewTitle} />
                        <Field
                          label="Review"
                          value={reviewBody}
                          onChangeText={setReviewBody}
                          multiline
                        />
                        <PrimaryButton
                          label={savingReview ? "Saving…" : "Submit review"}
                          onPress={() => void submitReview(item)}
                          disabled={savingReview}
                        />
                        <PrimaryButton
                          label="Cancel"
                          variant="outline"
                          onPress={() => setReviewingProductId(null)}
                        />
                      </View>
                    ) : (
                      <PrimaryButton
                        label="Write Review"
                        variant="outline"
                        onPress={() => {
                          setReviewingProductId(`${productId}-${index}`);
                          setReviewTitle("");
                          setReviewBody("");
                          setRating(5);
                          setError(null);
                        }}
                      />
                    )
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.meta}>No items recorded for this order.</Text>
          )}

          {shipping ? (
            <>
              <Text style={styles.section}>Shipping address</Text>
              <View style={styles.card}>
                {shipping.name ? <Text style={styles.shipName}>{shipping.name}</Text> : null}
                {shipping.phone ? <Text style={styles.address}>{shipping.phone}</Text> : null}
                {shipping.street ? <Text style={styles.address}>{shipping.street}</Text> : null}
                {shipping.locality ? <Text style={styles.address}>{shipping.locality}</Text> : null}
              </View>
            </>
          ) : null}

          <Text style={styles.section}>Total</Text>
          <View style={styles.card}>
            {order.subtotal != null ? (
              <View style={styles.totalRow}>
                <Text style={styles.item}>Subtotal</Text>
                <Text style={styles.item}>{formatInr(order.subtotal)}</Text>
              </View>
            ) : null}
            {order.shipping_amount != null ? (
              <View style={styles.totalRow}>
                <Text style={styles.item}>Shipping</Text>
                <Text style={styles.item}>{formatInr(order.shipping_amount)}</Text>
              </View>
            ) : null}
            {order.discount_amount ? (
              <View style={styles.totalRow}>
                <Text style={styles.item}>Discount</Text>
                <Text style={styles.item}>{formatInr(order.discount_amount)}</Text>
              </View>
            ) : null}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.total}>Total</Text>
              <Text style={styles.total}>{formatInr(order.total)}</Text>
            </View>
          </View>

          {canCancel ? (
            <Pressable
              onPress={cancelOrder}
              disabled={cancelling}
              style={({ pressed }) => [styles.cancelBtn, cancelling && styles.disabled, pressed && !cancelling && styles.pressed]}
            >
              <Text style={styles.cancelBtnText}>{cancelling ? "Submitting…" : "Cancel Order"}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push(`/invoice/${order.id}` as Href)}
            style={({ pressed }) => [styles.invoiceBtn, pressed && styles.pressed]}
          >
            <Text style={styles.invoiceBtnText}>View Invoice</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <StatusMessage title="Order unavailable" message="This order could not be found." />
      )}
      <CancelOrderModal
        visible={cancelOpen}
        orderNumber={order?.order_number ?? ""}
        isPrepaid={order ? orderIsPrepaidForCancel(order) : false}
        loading={cancelling}
        error={cancelError}
        onConfirm={(payload) => void handleConfirmCancel(payload)}
        onClose={() => {
          if (!cancelling) {
            setCancelOpen(false);
            setCancelError(null);
          }
        }}
      />
    </AccountStackFrame>
  );
}

function StatusBadge({ label, palette }: { label: string; palette: BadgePalette }) {
  return (
    <Text style={[styles.badge, { backgroundColor: palette.backgroundColor, color: palette.color }]}>
      {label}
    </Text>
  );
}

function shippingAddressDisplay(address?: Record<string, string>) {
  if (!address) return null;
  const street =
    address.line ||
    address.house_flat ||
    [address.line1, address.line2].filter(Boolean).join(", ") ||
    address.address ||
    "";
  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  const pincode = address.pincode || address.postal_code || "";
  const locality = [cityState, pincode].filter(Boolean).join(" – ");
  if (!address.name && !address.phone && !street && !locality) return null;
  return {
    name: address.name || "",
    phone: address.phone || "",
    street,
    locality,
  };
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  section: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Brand.maroon,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 14,
    gap: 6,
  },
  number: { fontFamily: Brand.displayFont, fontSize: 26, color: Brand.maroon },
  meta: { color: Brand.muted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "700",
  },
  item: { color: Brand.ink },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 12,
    gap: 10,
  },
  itemRow: { flexDirection: "row", gap: 12 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Brand.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbFallback: { color: Brand.muted },
  itemCopy: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontWeight: "700", color: Brand.ink, fontSize: 15 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalDivider: { height: 1, backgroundColor: Brand.blushBorder, marginVertical: 4 },
  total: { fontWeight: "800", color: Brand.maroon, fontSize: 18 },
  shipName: { fontWeight: "700", color: Brand.ink, fontSize: 15 },
  address: { color: Brand.muted, lineHeight: 20 },
  reviewed: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: Brand.discountBg,
    color: Brand.discount,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: 12,
  },
  reviewForm: { gap: 10 },
  legend: { fontWeight: "700", color: Brand.maroon },
  ratingRow: { flexDirection: "row", gap: 8 },
  star: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  starActive: { backgroundColor: Brand.maroon, borderColor: Brand.maroon },
  starText: { fontWeight: "700", color: Brand.muted },
  starTextActive: { color: Brand.white },
  cancelBtn: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DC2626",
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cancelBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
  invoiceBtn: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.maroon,
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  invoiceBtnText: { color: Brand.maroon, fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  error: {
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    color: "#B42318",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  success: {
    borderRadius: 12,
    backgroundColor: Brand.discountBg,
    color: Brand.discount,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
