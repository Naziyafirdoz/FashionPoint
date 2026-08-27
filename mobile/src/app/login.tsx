import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import {
  AuthError,
  AuthLayout,
  safeAccountHref,
  toAuthUserMessage,
} from "@/components/auth/AuthLayout";
import { isValidEmail } from "@/lib/account";
import { Field, PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destination = safeAccountHref(redirect);

  useEffect(() => {
    if (!loading && user) {
      router.replace(destination);
    }
  }, [destination, loading, router, user]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email.");
      setBusy(false);
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email.");
      setBusy(false);
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      setBusy(false);
      return;
    }
    try {
      await signIn(trimmedEmail, password);
    } catch (err) {
      setError(toAuthUserMessage(err, "Sign in failed. Please check your details."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your Fashion Point account"
      footer={
        <Text style={styles.footerText}>
          Don't have an account?{" "}
          <Text
            onPress={() => router.push("/signup" as Href)}
            style={styles.footerLink}
          >
            Create one
          </Text>
        </Text>
      }
    >
      <AuthError message={error} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Pressable
        onPress={() => router.push("/forgot-password" as Href)}
        accessibilityRole="link"
        accessibilityLabel="Forgot password?"
        style={styles.forgotWrap}
      >
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>
      <PrimaryButton
        label={busy ? "Signing in…" : "Sign In"}
        onPress={() => void submit()}
        disabled={busy || loading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotWrap: { alignSelf: "flex-end" },
  forgot: {
    fontSize: 14,
    fontWeight: "600",
    color: Brand.maroon,
    textDecorationLine: "underline",
  },
  footerText: {
    fontSize: 14,
    color: Brand.muted,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: "700",
    color: Brand.maroon,
    textDecorationLine: "underline",
  },
});
