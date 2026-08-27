import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { formatInr } from "@/lib/catalog";
import { useCart } from "@/providers/CartProvider";

export default function CartScreen() {
  const router = useRouter();
  const cart = useCart();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Bag" />
          {cart.items.length === 0 ? (
            <StatusMessage
              title="Your bag is empty"
              message="Add a blouse from the shop to continue."
              actionLabel="Continue shopping"
              onAction={() => router.push("/shop" as Href)}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              {cart.items.map((item) => (
                <View key={`${item.productId}-${item.size}-${item.color}`} style={styles.card}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} contentFit="contain" />
                  ) : (
                    <View style={styles.image} />
                  )}
                  <View style={styles.copy}>
                    <Pressable onPress={() => router.push(`/product/${item.slug}` as Href)}>
                      <Text style={styles.name}>{item.name}</Text>
                    </Pressable>
                    <Text style={styles.meta}>
                      {item.size} · {item.color}
                    </Text>
                    <Text style={styles.price}>{formatInr(item.price)}</Text>
                    <View style={styles.qty}>
                      <Pressable
                        onPress={() =>
                          cart.updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                        }
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyText}>-</Text>
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() =>
                          cart.updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                        }
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyText}>+</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => cart.removeItem(item.productId, item.size, item.color)}
                    >
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.totals}>
                <Row label="Subtotal" value={formatInr(cart.subtotal)} />
                {cart.discount > 0 ? <Row label="Discount" value={`- ${formatInr(cart.discount)}`} /> : null}
                <Row label="Total" value={formatInr(cart.total)} bold />
              </View>

              <PrimaryButton
                label="Continue shopping"
                variant="outline"
                onPress={() => router.push("/shop" as Href)}
              />
              <PrimaryButton
                label="Proceed to checkout"
                onPress={() => {
                  if (cart.items.length === 0) {
                    Alert.alert("Bag empty", "Add a blouse before checkout.");
                    return;
                  }
                  router.push("/checkout" as Href);
                }}
              />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold ? styles.bold : null]}>{label}</Text>
      <Text style={[styles.totalValue, bold ? styles.bold : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Brand.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    padding: 12,
  },
  image: { width: 88, height: 88, borderRadius: 12, backgroundColor: Brand.blush },
  copy: { flex: 1, gap: 4 },
  name: { fontWeight: "700", color: Brand.ink },
  meta: { color: Brand.muted, fontSize: 13 },
  price: { color: Brand.maroon, fontWeight: "800" },
  qty: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { color: Brand.maroon, fontWeight: "800" },
  qtyValue: { minWidth: 18, textAlign: "center", fontWeight: "700" },
  remove: { color: Brand.muted, fontSize: 13, marginTop: 4 },
  totals: {
    borderRadius: 16,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    padding: 16,
    gap: 8,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: Brand.muted },
  totalValue: { color: Brand.ink },
  bold: { fontWeight: "800", color: Brand.maroon },
});
