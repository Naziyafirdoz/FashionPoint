import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";

const LOGO = require("@/assets/brand/fashion-point-logo.png");
const LOGO_WIDTH = 90;
const LOGO_ASPECT = 132 / 92;

export function toAuthUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  const message = error.message.trim();
  if (message.length > 180) return fallback;
  if (/jwt|stack|undefined|service.?role|secret|apikey/i.test(message)) return fallback;
  return message;
}

export function safeAccountHref(redirect?: string | string[]): Href {
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login")) {
    return value as Href;
  }
  return "/account" as Href;
}

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            style={[styles.frame, { maxWidth: MaxContentWidth }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => router.replace("/(tabs)" as Href)}
              accessibilityRole="link"
              accessibilityLabel="Fashion Point home"
              style={styles.logoWrap}
            >
              <Image source={LOGO} style={styles.logo} contentFit="contain" />
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.card}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
  );
}

export function AuthSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.success} accessibilityRole="text">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  flex: { flex: 1, width: "100%", alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  logoWrap: { alignSelf: "center", marginBottom: 12 },
  logo: {
    width: LOGO_WIDTH,
    height: Math.round(LOGO_WIDTH * LOGO_ASPECT),
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 26,
    fontWeight: "700",
    color: Brand.maroon,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
    textAlign: "center",
  },
  card: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
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
