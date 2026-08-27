import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Field, PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";

type CancelOrderModalProps = {
  visible: boolean;
  orderNumber: string;
  isPrepaid: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: (payload: { cancellation_reason?: string }) => void;
  onClose: () => void;
};

export function CancelOrderModal({
  visible,
  orderNumber,
  isPrepaid,
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: CancelOrderModalProps) {
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    if (!visible) return;
    setCancellationReason("");
  }, [visible]);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = () => {
    if (loading) return;
    onConfirm({
      cancellation_reason: cancellationReason.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.cardBody}
            >
              <Text style={styles.title}>Cancel Order</Text>
              <Text style={styles.message}>Are you sure you want to cancel this order?</Text>
              {orderNumber ? <Text style={styles.orderRef}>Order {orderNumber}</Text> : null}

              <Field
                label="Cancellation Reason (optional)"
                value={cancellationReason}
                onChangeText={setCancellationReason}
                placeholder="Tell us why you are cancelling"
                multiline
                editable={!loading}
              />

              {isPrepaid ? (
                <View style={styles.refundBox}>
                  <Text style={styles.refundLabel}>Refund Method</Text>
                  <Text style={styles.refundMethod}>Original Payment Method</Text>
                  <Text style={styles.refundCopy}>
                    After the store reviews this request, your refund will be processed to the original
                    payment method used for this order.
                  </Text>
                </View>
              ) : (
                <Text style={styles.codCopy}>
                  Your order will be cancelled. No payment was collected for this COD order.
                </Text>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <PrimaryButton
                  label="Keep Order"
                  variant="outline"
                  onPress={handleClose}
                  disabled={loading}
                />
                <PrimaryButton
                  label={loading ? "Submitting…" : "Confirm Cancellation"}
                  onPress={handleSubmit}
                  disabled={loading}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(42, 42, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    maxHeight: "90%",
    borderRadius: 24,
    backgroundColor: Brand.white,
    overflow: "hidden",
  },
  cardBody: {
    padding: 22,
    gap: 10,
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
  orderRef: {
    fontSize: 12,
    color: Brand.muted,
  },
  refundBox: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Brand.blushBorder,
    gap: 4,
  },
  refundLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.ink,
  },
  refundMethod: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.maroon,
  },
  refundCopy: {
    fontSize: 12,
    lineHeight: 16,
    color: Brand.muted,
  },
  codCopy: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  error: {
    color: "#9B1C1C",
    fontSize: 13,
    lineHeight: 18,
  },
});
