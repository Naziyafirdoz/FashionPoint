import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { Field, PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { fetchCustomerProfile, updateCustomerProfile } from "@/lib/account";
import { toUserMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

function asText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredSize, setPreferredSize] = useState("");
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [shoulder, setShoulder] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profile = await fetchCustomerProfile();
      setEmail(profile.email);
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setPreferredSize(profile.preferred_size ?? "");
      setBust(asText(profile.bust_measurement));
      setWaist(asText(profile.waist_measurement));
      setShoulder(asText(profile.shoulder_measurement));
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Unable to load profile."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateCustomerProfile({
        full_name: fullName,
        phone,
        preferred_size: preferredSize,
        bust_measurement: bust,
        waist_measurement: waist,
        shoulder_measurement: shoulder,
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(toUserMessage(err, "Unable to update profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountStackFrame title="My Profile">
      {!user ? (
        <StatusMessage
          title="Sign in required"
          message="Sign in to view and edit your profile."
          actionLabel="Sign in"
          onAction={() => router.push("/login?redirect=/profile" as Href)}
        />
      ) : loading ? (
        <ActivityIndicator color={Brand.maroon} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={styles.copy}>Update your details and measurements.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <Field label="Email" value={email} onChangeText={setEmail} editable={false} />
          <Field label="Full Name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field
            label="Preferred Size"
            value={preferredSize}
            onChangeText={setPreferredSize}
            placeholder="e.g. 36"
          />
          <Text style={styles.legend}>Measurements (inches)</Text>
          <Field label="Bust" value={bust} onChangeText={setBust} keyboardType="decimal-pad" />
          <Field label="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" />
          <Field label="Shoulder" value={shoulder} onChangeText={setShoulder} keyboardType="decimal-pad" />
          <PrimaryButton
            label={saving ? "Saving…" : "Save Profile"}
            onPress={() => void save()}
            disabled={saving}
          />
        </ScrollView>
      )}
    </AccountStackFrame>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, fontSize: 14 },
  legend: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: Brand.maroon,
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
