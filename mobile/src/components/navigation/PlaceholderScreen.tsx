import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";

import { AppHeader } from "./AppHeader";
import { StackHeader } from "./StackHeader";

type PlaceholderScreenProps = {
  title: string;
  eyebrow: string;
  message: string;
  variant: "tab" | "stack";
};

export function PlaceholderScreen({
  title,
  eyebrow,
  message,
  variant,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          {variant === "tab" ? <AppHeader /> : <StackHeader title={title} />}
          <View
            style={[
              styles.body,
              variant === "tab" && { paddingBottom: BottomTabInset + 24 },
            ]}
          >
            <View style={styles.card}>
              <Text style={styles.goldMark}>✦</Text>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.ivory,
  },
  safe: {
    flex: 1,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    justifyContent: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  goldMark: {
    color: Brand.gold,
    fontSize: 16,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: Brand.gold,
    marginBottom: 10,
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 28,
    fontWeight: "700",
    color: Brand.maroon,
    textAlign: "center",
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Brand.muted,
    textAlign: "center",
  },
});
