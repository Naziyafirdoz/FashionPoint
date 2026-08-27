import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { Field, PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { apiFetch, toUserMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type NotifyMeModalProps = {
  visible: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
};

export function NotifyMeModal({
  visible,
  productId,
  productName,
  onClose,
}: NotifyMeModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSuccess(false);
    setError(null);
    setName(
      typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""
    );
    setEmail(user?.email ?? "");
  }, [visible, user]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/stock-notify", {
        method: "POST",
        auth: "auto",
        body: JSON.stringify({
          product_id: productId,
          product_name: productName,
          customer_name: name.trim(),
          customer_email: email.trim(),
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(toUserMessage(err, "Unable to save your request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          {success ? (
            <>
              <Text style={styles.eyebrow}>We will email you</Text>
              <Text style={styles.title}>You are on the list</Text>
              <Text style={styles.message}>
                We will notify you at {email.trim()} when {productName} is back in stock.
              </Text>
              <PrimaryButton label="Done" onPress={onClose} />
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>Out of stock</Text>
              <Text style={styles.title}>Notify Me When Available</Text>
              <Text style={styles.message}>
                Leave your details and we will email you when this blouse is back.
              </Text>
              <View style={styles.form}>
                <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={submitting ? "Sending..." : "Notify Me"}
                onPress={submit}
                disabled={submitting}
              />
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(42, 42, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: Brand.white,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: Brand.gold,
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 24,
    color: Brand.maroon,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  form: {
    marginTop: 8,
    gap: 12,
  },
  error: {
    color: "#9B1C1C",
    fontSize: 13,
  },
  cancel: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    color: Brand.muted,
    fontWeight: "600",
  },
});
