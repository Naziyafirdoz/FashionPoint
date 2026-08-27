import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Order confirmed" />
          <View style={styles.body}>
            <Text style={styles.eyebrow}>Thank you</Text>
            <Text style={styles.title}>Payment successful</Text>
            <Text style={styles.copy}>
              Your order {orderNumber} is confirmed. You can view details and the invoice in My Orders.
            </Text>
            <PrimaryButton label="View my orders" onPress={() => router.replace("/orders" as Href)} />
            <PrimaryButton
              label="Continue shopping"
              variant="outline"
              onPress={() => router.replace("/shop" as Href)}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 24, gap: 14 },
  eyebrow: {
    color: Brand.gold,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: { fontFamily: Brand.displayFont, fontSize: 30, color: Brand.maroon },
  copy: { color: Brand.muted, lineHeight: 22 },
});
