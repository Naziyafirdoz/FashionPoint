import { useEffect, useState } from "react";
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

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && !success) {
      router.replace("/account" as Href);
    }
  }, [loading, router, success, user]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      setBusy(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setBusy(false);
      return;
    }

    try {
      const message = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      if (message) {
        setSuccess(message);
        setBusy(false);
        return;
      }
    } catch (err) {
      setError(toAuthUserMessage(err, "Could not create your account."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Fashion Point for a personalized blouse shopping experience"
      footer={
        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text onPress={() => router.push("/login" as Href)} style={styles.footerLink}>
            Sign in
          </Text>
        </Text>
      }
    >
      <AuthError message={error} />
      <AuthSuccess message={success} />
      <Field
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <PrimaryButton
        label={busy ? "Creating account…" : "Create Account"}
        onPress={() => void submit()}
        disabled={busy || loading}
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
