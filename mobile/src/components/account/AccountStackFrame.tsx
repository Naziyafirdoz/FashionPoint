import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";

export function AccountStackFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
            <StackHeader title={title} fallbackHref="/account" />
            {children}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  flex: { flex: 1, width: "100%", alignItems: "center" },
  frame: { flex: 1, width: "100%" },
});
