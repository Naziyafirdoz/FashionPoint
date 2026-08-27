import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";

import {
  AuthError,
  AuthLayout,
  AuthSuccess,
  toAuthUserMessage,
} from "@/components/auth/AuthLayout";
import { Field, PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/providers/AuthProvider";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await requestPasswordReset(email.trim());
      setSuccess("If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(toAuthUserMessage(err, "Could not send a reset link. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="We'll send you a link to reset your password"
      footer={
        <Text style={styles.footerText}>
          Remember your password?{" "}
          <Text onPress={() => router.push("/login" as Href)} style={styles.footerLink}>
            Sign in
          </Text>
        </Text>
      }
    >
      <AuthError message={error} />
      <AuthSuccess message={success} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <PrimaryButton
        label={busy ? "Sending…" : "Send Reset Link"}
        onPress={() => void submit()}
        disabled={busy}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
