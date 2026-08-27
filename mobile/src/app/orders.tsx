import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { CancelOrderModal } from "@/components/account/CancelOrderModal";
import { CustomerCancelledOrderSection } from "@/components/account/CustomerCancelledOrderSection";
import { StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import {
  CUSTOMER_ORDER_STATUS_MESSAGE,
  canCustomerCancelOrder,
  fetchCustomerOrders,
  formatOrderDate,
  formatOrderStatus,
  formatOrderTime,
  formatPaymentMethod,
  formatPaymentStatus,
  getOrderItemProductId,
  orderIsPrepaidForCancel,
  orderStatusBadgePalette,
  paymentMethodBadgePalette,
  paymentStatusBadgePalette,
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
import { useAuth } from "@/providers/AuthProvider";

const PREVIEW_LIMIT = 2;

type UserReview = {
  id: string;
  product_id: string;
  order_id: string | null;
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CustomerOrder | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    try {
      const [orderData, reviewData] = await Promise.all([
        fetchCustomerOrders(),
        apiFetch<{ reviews: UserReview[] }>("/api/reviews?mine=true", { auth: "required" }).catch(
          () => ({ reviews: [] as UserReview[] })
        ),
      ]);
      setOrders(orderData);
      setReviews(reviewData.reviews ?? []);
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setError(toOrderLoadMessage(err, "Unable to load orders."));
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const cancelOrder = (order: CustomerOrder) => {
    setMessage(null);
    setCancelError(null);
    setCancelTarget(order);
  };

  const handleConfirmCancel = async (payload: { cancellation_reason?: string }) => {
    if (!cancelTarget || cancelLoading) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const result = await submitCustomerOrderCancellation(
        cancelTarget.id,
        payload.cancellation_reason
      );
      if (result.order) {
        setOrders((prev) =>
          prev.map((item) =>
            item.id === result.order!.id
              ? { ...item, ...result.order!, items: result.order!.items.length ? result.order!.items : item.items }
              : item
          )
        );
      }
      setCancelTarget(null);
      setMessage(result.message);
      await load({ silent: true });
    } catch (err) {
      setCancelError(toCancelOrderMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <AccountStackFrame title="My Orders">
      {!user ? (
        <StatusMessage
          title="Sign in required"
          message="Sign in to view your orders."
          actionLabel="Sign in"
          onAction={() => router.push("/login?redirect=/orders" as Href)}
        />
      ) : loading ? (
        <StatusMessage message="Loading your orders..." />
      ) : error ? (
        <StatusMessage title="Unable to load orders" message={error} actionLabel="Try again" onAction={() => void load()} />
      ) : orders.length === 0 ? (
        <StatusMessage
          title="You haven't placed any orders yet."
          message="When you place an order, it will appear here."
          actionLabel="Shop blouses"
          onAction={() => router.push("/shop" as Href)}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              reviews={reviews}
              cancelling={cancelLoading && cancelTarget?.id === order.id}
              onPress={() => router.push(`/order/${order.id}` as Href)}
              onInvoice={() => router.push(`/invoice/${order.id}` as Href)}
              onCancel={() => cancelOrder(order)}
              onReview={() => router.push(`/order/${order.id}` as Href)}
            />
          ))}
        </ScrollView>
      )}
      <CancelOrderModal
        visible={cancelTarget != null}
        orderNumber={cancelTarget?.order_number ?? ""}
        isPrepaid={cancelTarget ? orderIsPrepaidForCancel(cancelTarget) : false}
        loading={cancelLoading}
        error={cancelError}
        onConfirm={(payload) => void handleConfirmCancel(payload)}
        onClose={() => {
          if (!cancelLoading) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
      />
    </AccountStackFrame>
  );
}

function hasOrderReview(reviews: UserReview[], orderId: string, productId: string) {
  return reviews.some((review) => review.product_id === productId && review.order_id === orderId);
}

function formatItemPrice(item: CustomerOrderItem): string {
  if (item.quantity <= 1) return formatInr(item.price);
  return `${formatInr(item.price)} × ${item.quantity} = ${formatInr(item.subtotal)}`;
}

function OrderCard({
  order,
  reviews,
  cancelling,
  onPress,
  onInvoice,
  onCancel,
  onReview,
}: {
  order: CustomerOrder;
  reviews: UserReview[];
  cancelling: boolean;
  onPress: () => void;
  onInvoice: () => void;
  onCancel: () => void;
  onReview: () => void;
}) {
  const paymentMethod = formatPaymentMethod(order.payment_method);
  const preview = order.items.slice(0, PREVIEW_LIMIT);
  const extra = order.items.length - preview.length;
  const time = formatOrderTime(order.created_at);
  const showProgress = shouldShowOrderProgressMessage(order.status);
  const canCancel = canCustomerCancelOrder(order);
  const delivered = order.status.trim().toLowerCase() === "delivered";
  const reviewableIds = order.items.map(getOrderItemProductId).filter(Boolean);
  const canWriteReview =
    delivered && reviewableIds.some((productId) => !hasOrderReview(reviews, order.id, productId));
  const reviewSubmitted =
    delivered && reviewableIds.length > 0 && reviewableIds.every((productId) => hasOrderReview(reviews, order.id, productId));

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.number}>{order.order_number}</Text>
          <Text style={styles.date}>
            {formatOrderDate(order.created_at)}
            {time ? ` · ${time}` : ""}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={formatPaymentStatus(order.payment_status)} palette={paymentStatusBadgePalette(order.payment_status)} />
            {paymentMethod ? <Badge label={paymentMethod} palette={paymentMethodBadgePalette()} /> : null}
          </View>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.total}>{formatInr(order.total)}</Text>
          <Text style={styles.totalCaption}>Total Amount</Text>
          {order.shipping_amount != null ? (
            <Text style={styles.totalCaption}>Shipping {formatInr(order.shipping_amount)}</Text>
          ) : null}
          <Badge
            label={formatOrderStatus(order.status)}
            palette={orderStatusBadgePalette(order.status)}
            prominent
          />
        </View>
      </View>

      {showProgress ? <Text style={styles.progress}>{CUSTOMER_ORDER_STATUS_MESSAGE}</Text> : null}

      <CustomerCancelledOrderSection order={order} />

      {preview.length ? (
        <View style={styles.previewList}>
          {preview.map((item, index) => (
            <ItemPreview key={`${item.productId || item.name}-${index}`} item={item} />
          ))}
          {extra > 0 ? <Text style={styles.more}>+{extra} more</Text> : null}
        </View>
      ) : (
        <Text style={styles.meta}>No items recorded for this order.</Text>
      )}

      <View style={styles.actions}>
        <ActionButton label="View Invoice" onPress={onInvoice} />
        {canCancel ? (
          <ActionButton
            label={cancelling ? "Submitting…" : "Cancel Order"}
            tone="danger"
            disabled={cancelling}
            onPress={onCancel}
          />
        ) : null}
        {canWriteReview ? <ActionButton label="Write Review" onPress={onReview} /> : null}
        {reviewSubmitted ? <Text style={styles.reviewed}>Review Submitted</Text> : null}
      </View>
    </Pressable>
  );
}

function ItemPreview({ item }: { item: CustomerOrderItem }) {
  const image = resolveMediaUrl(item.image);
  return (
    <View style={styles.previewRow}>
      <View style={styles.thumb}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <Text style={styles.thumbFallback}>—</Text>
        )}
      </View>
      <View style={styles.previewCopy}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>Size: {item.size}</Text>
        <Text style={styles.itemMeta}>Color: {item.color}</Text>
        <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
        <Text style={styles.itemPrice}>Price: {formatItemPrice(item)}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = "brand",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "brand" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        if (!disabled) onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        tone === "danger" ? styles.actionDanger : styles.actionBrand,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, tone === "danger" ? styles.actionDangerText : styles.actionBrandText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({
  label,
  palette,
  prominent = false,
}: {
  label: string;
  palette: BadgePalette;
  prominent?: boolean;
}) {
  return (
    <Text
      style={[
        styles.badge,
        prominent && styles.badgeProminent,
        { backgroundColor: palette.backgroundColor, color: palette.color },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: "#FFFDFD",
    padding: 16,
    gap: 8,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.92 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  number: { fontWeight: "800", color: Brand.maroon, fontSize: 18 },
  date: { color: Brand.muted, fontSize: 12 },
  totalCol: { alignItems: "flex-end", gap: 2, maxWidth: "46%" },
  total: { fontWeight: "800", color: Brand.maroon, fontSize: 20 },
  totalCaption: { color: Brand.muted, fontSize: 11 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "700",
    alignSelf: "flex-start",
  },
  badgeProminent: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 5 },
  progress: { color: Brand.muted, fontSize: 12, lineHeight: 16 },
  success: {
    borderRadius: 12,
    backgroundColor: Brand.discountBg,
    color: Brand.discount,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  meta: { color: Brand.muted, fontSize: 13 },
  previewList: { gap: 10, borderTopWidth: 1, borderTopColor: Brand.blushBorder, paddingTop: 10 },
  previewRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Brand.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbFallback: { color: Brand.muted, fontSize: 12 },
  previewCopy: { flex: 1, minWidth: 0 },
  itemName: { fontWeight: "700", color: Brand.ink, fontSize: 14, marginBottom: 2 },
  itemMeta: { color: Brand.muted, fontSize: 12, lineHeight: 16 },
  itemPrice: { marginTop: 2, color: Brand.ink, fontSize: 13, fontWeight: "700" },
  more: { color: Brand.maroon, fontWeight: "700", fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, alignItems: "center" },
  actionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: Brand.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBrand: { borderColor: Brand.maroon },
  actionDanger: { borderColor: "#DC2626" },
  actionDisabled: { opacity: 0.45 },
  actionText: { fontWeight: "700", fontSize: 13 },
  actionBrandText: { color: Brand.maroon },
  actionDangerText: { color: "#DC2626" },
  reviewed: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: Brand.discountBg,
    color: Brand.discount,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "700",
    fontSize: 12,
  },
});
