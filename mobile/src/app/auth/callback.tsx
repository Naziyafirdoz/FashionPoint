import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { Brand } from "@/constants/brand";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, loading, handlingDeepLink, passwordRecovery } = useAuth();

  useEffect(() => {
    if (loading || handlingDeepLink) return;
    if (passwordRecovery) {
      router.replace("/reset-password" as Href);
      return;
    }
    router.replace((user ? "/account" : "/login") as Href);
  }, [handlingDeepLink, loading, passwordRecovery, router, user]);

  return (
    <View style={styles.screen} accessibilityLabel="Completing sign-in">
      <ActivityIndicator color={Brand.maroon} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Brand.ivory,
  },
});
