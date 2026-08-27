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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!session) {
      setError("This reset link is invalid or has expired. Request a new link and try again.");
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setSuccess("Password updated successfully. Redirecting…");
      setTimeout(() => {
        router.replace("/account" as Href);
      }, 1500);
    } catch (err) {
      setError(toAuthUserMessage(err, "Could not update your password. Please try again."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password"
      footer={
        <Text
          onPress={() => router.push("/login" as Href)}
          style={styles.footerLink}
        >
          Back to sign in
        </Text>
      }
    >
      <AuthError message={error} />
      <AuthSuccess message={success} />
      <Field
        label="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
      />
      <PrimaryButton
        label={busy ? "Updating…" : "Update Password"}
        onPress={() => void submit()}
        disabled={busy}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.maroon,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
