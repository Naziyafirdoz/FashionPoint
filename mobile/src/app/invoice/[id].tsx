import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import {
  fetchCustomerOrderById,
  formatOrderDate,
  formatPaymentMethod,
  formatPaymentStatus,
  formatShippingLines,
  resolveRouteId,
  toOrderLoadMessage,
  type CustomerOrder,
} from "@/lib/account";
import { formatInr } from "@/lib/catalog";
import { useFocusEffect } from "expo-router";

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = resolveRouteId(params.id);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError("Invoice could not be found.");
      return;
    }
    setLoading(true);
    try {
      setOrder(await fetchCustomerOrderById(id));
      setError(null);
    } catch (err) {
      setOrder(null);
      setError(toOrderLoadMessage(err, "Unable to load invoice."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const invoiceNumber = order ? `INV-${order.order_number}` : "";
  const shippingLines = formatShippingLines(order?.shipping_address);
  const paymentMethod = formatPaymentMethod(order?.payment_method);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Invoice" fallbackHref="/account" />
          {loading ? (
            <StatusMessage message="Loading invoice..." />
          ) : error || !order ? (
            <StatusMessage title="Invoice unavailable" message={error ?? "Invoice could not be found."} />
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={styles.brand}>Fashion Point</Text>
              <Text style={styles.tagline}>Tax Invoice / Order Invoice</Text>
              <Text style={styles.label}>Invoice {invoiceNumber}</Text>
              <Text style={styles.meta}>Order {order.order_number}</Text>
              <Text style={styles.meta}>Date {formatOrderDate(order.created_at)}</Text>
              <Text style={styles.meta}>Payment {formatPaymentStatus(order.payment_status)}</Text>
              {paymentMethod ? <Text style={styles.meta}>Method {paymentMethod}</Text> : null}

              {shippingLines.length ? (
                <View style={styles.block}>
                  <Text style={styles.section}>Ship to</Text>
                  <Text style={styles.address}>{shippingLines.join("\n")}</Text>
                </View>
              ) : null}

              <View style={styles.block}>
                <Text style={styles.section}>Items</Text>
                {order.items.length ? (
                  order.items.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={styles.row}>
                      <View style={styles.itemCopy}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemMeta}>
                          Qty {item.quantity}
                          {item.size && item.size !== "—" ? ` · ${item.size}` : ""}
                          {item.color && item.color !== "—" ? ` · ${item.color}` : ""}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>{formatInr(item.subtotal)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.meta}>No items recorded for this order.</Text>
                )}
              </View>

              {order.subtotal != null ? (
                <View style={styles.row}>
                  <Text>Subtotal</Text>
                  <Text>{formatInr(order.subtotal)}</Text>
                </View>
              ) : null}
              {order.shipping_amount != null ? (
                <View style={styles.row}>
                  <Text>Shipping</Text>
                  <Text>{formatInr(order.shipping_amount)}</Text>
                </View>
              ) : null}
              {order.discount_amount ? (
                <View style={styles.row}>
                  <Text>Discount</Text>
                  <Text>{formatInr(order.discount_amount)}</Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={styles.total}>Total</Text>
                <Text style={styles.total}>{formatInr(order.total)}</Text>
              </View>
              <PrimaryButton label="Back to order" onPress={() => router.replace(`/order/${order.id}` as Href)} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, gap: 8, paddingBottom: 40 },
  brand: { fontFamily: Brand.displayFont, fontSize: 28, color: Brand.maroon },
  tagline: { color: Brand.goldDeep, fontSize: 13, fontWeight: "600" },
  label: { fontWeight: "800", color: Brand.ink, fontSize: 16, marginTop: 8 },
  meta: { color: Brand.muted },
  block: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 14,
    gap: 8,
  },
  section: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Brand.maroon,
  },
  address: { color: Brand.ink, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: Brand.ink, fontWeight: "700" },
  itemMeta: { color: Brand.muted, fontSize: 12, marginTop: 2 },
  itemPrice: { color: Brand.ink, fontWeight: "700" },
  total: { fontWeight: "800", color: Brand.maroon },
});
