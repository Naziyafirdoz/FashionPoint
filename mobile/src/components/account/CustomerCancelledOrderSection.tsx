import { StyleSheet, Text, View } from "react-native";

import { Brand } from "@/constants/brand";
import {
  customerCancelApprovedMessage,
  customerCancelRequestMessage,
  customerRefundStatusLabel,
  formatOrderDate,
  refundMethodLabel,
  resolveCancelledAt,
  shouldShowCancelledRefundDetails,
  type CustomerOrder,
} from "@/lib/account";
import { formatInr } from "@/lib/catalog";

export function CustomerCancelledOrderSection({ order }: { order: CustomerOrder }) {
  const status = (order.status ?? "").trim().toLowerCase();

  if (status === "cancel_requested") {
    return (
      <View style={[styles.box, styles.requested]}>
        <Text style={[styles.title, styles.requestedTitle]}>Cancel Requested</Text>
        <Text style={styles.body}>{customerCancelRequestMessage()}</Text>
        <RefundDetails order={order} showEstimate={false} fallbackMethod={false} alwaysShowStatus />
      </View>
    );
  }

  if (status === "cancellation_approved") {
    return (
      <View style={[styles.box, styles.approved]}>
        <Text style={[styles.title, styles.approvedTitle]}>Cancellation Approved</Text>
        <Text style={styles.body}>{customerCancelApprovedMessage(order)}</Text>
        <RefundDetails order={order} showEstimate={false} fallbackMethod={false} alwaysShowStatus />
      </View>
    );
  }

  if (status !== "cancelled") return null;

  const cancelledAt = resolveCancelledAt(order);
  const showRefundDetails = shouldShowCancelledRefundDetails(order);

  return (
    <View style={[styles.box, styles.cancelled]}>
      <Text style={[styles.title, styles.cancelledTitle]}>Cancelled</Text>
      <Text style={styles.body}>Order cancelled on {formatOrderDate(cancelledAt)}</Text>
      {showRefundDetails ? (
        <RefundDetails order={order} showEstimate fallbackMethod />
      ) : null}
    </View>
  );
}

function RefundDetails({
  order,
  showEstimate,
  fallbackMethod,
  alwaysShowStatus = false,
}: {
  order: CustomerOrder;
  showEstimate: boolean;
  fallbackMethod: boolean;
  alwaysShowStatus?: boolean;
}) {
  const refundLabel = customerRefundStatusLabel(order);
  const methodLabel = refundMethodLabel(order.refund_method);
  const showMethod = Boolean(order.refund_method) || fallbackMethod;
  const amount = order.refund_amount != null && order.refund_amount > 0 ? order.refund_amount : null;
  const payment = (order.payment_status ?? "").toLowerCase();
  const showEstimatedTime = showEstimate && payment !== "refunded";
  const showStatus = alwaysShowStatus || refundLabel !== "—";

  if (!showStatus && !showMethod && amount == null && !showEstimatedTime) {
    return null;
  }

  return (
    <View style={styles.details}>
      {showStatus ? (
        <View style={styles.row}>
          <Text style={styles.dt}>Refund Status</Text>
          <Text style={styles.dd}>{refundLabel}</Text>
        </View>
      ) : null}
      {showMethod ? (
        <View style={styles.row}>
          <Text style={styles.dt}>Refund Method</Text>
          <Text style={styles.dd}>{methodLabel === "—" ? "Original Payment Method" : methodLabel}</Text>
        </View>
      ) : null}
      {amount != null ? (
        <View style={styles.row}>
          <Text style={styles.dt}>Refund Amount</Text>
          <Text style={styles.dd}>{formatInr(amount)}</Text>
        </View>
      ) : null}
      {showEstimatedTime ? (
        <View style={styles.row}>
          <Text style={styles.dt}>Estimated Refund Time</Text>
          <Text style={styles.dd}>Approximately 5 Business Days</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  requested: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  approved: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  cancelled: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  title: { fontWeight: "800", fontSize: 13 },
  requestedTitle: { color: "#9A3412" },
  approvedTitle: { color: "#92400E" },
  cancelledTitle: { color: "#B91C1C" },
  body: { color: Brand.muted, fontSize: 12, lineHeight: 16 },
  details: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(123, 13, 43, 0.08)",
    gap: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  dt: { color: Brand.muted, fontSize: 12, flexShrink: 0 },
  dd: { color: Brand.ink, fontSize: 12, fontWeight: "700", textAlign: "right", flex: 1 },
});
