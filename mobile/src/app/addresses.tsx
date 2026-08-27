import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { Field, PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import {
  ADDRESS_LABELS,
  MAX_ADDRESSES,
  deleteCustomerAddress,
  fetchCustomerAddresses,
  requiredAddressError,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  type AddressRecord,
} from "@/lib/account";
import { toUserMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type AddressFormState = {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

function emptyForm(isFirst: boolean): AddressFormState {
  return {
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    is_default: isFirst,
  };
}

function fromAddress(address: AddressRecord): AddressFormState {
  return {
    label: address.label || "Home",
    name: address.name ?? "",
    phone: address.phone ?? "",
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? "",
    is_default: address.is_default,
  };
}

export default function AddressesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyForm(true));
  const [saving, setSaving] = useState(false);

  const canAddMore = addresses.length < MAX_ADDRESSES;

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAddresses(await fetchCustomerAddresses());
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Unable to load addresses."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm(addresses.length === 0));
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (address: AddressRecord) => {
    setEditingId(address.id);
    setForm(fromAddress(address));
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const save = async () => {
    const validationError = requiredAddressError(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveCustomerAddress(form, editingId);
      setSuccess("Address saved successfully.");
      closeForm();
      await load();
    } catch (err) {
      setError(toUserMessage(err, "Unable to save address."));
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert("Delete this address?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setError(null);
            try {
              await deleteCustomerAddress(id);
              if (editingId === id) closeForm();
              await load();
            } catch (err) {
              setError(toUserMessage(err, "Unable to delete address."));
            }
          })();
        },
      },
    ]);
  };

  const setDefault = async (address: AddressRecord) => {
    setError(null);
    try {
      await setDefaultCustomerAddress(address.id);
      await load();
    } catch (err) {
      setError(toUserMessage(err, "Unable to set default address."));
    }
  };

  return (
    <AccountStackFrame title="Saved Addresses">
      {!user ? (
        <StatusMessage
          title="Sign in required"
          message="Sign in to manage saved addresses."
          actionLabel="Sign in"
          onAction={() => router.push("/login?redirect=/addresses" as Href)}
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
          <Text style={styles.copy}>
            Manage delivery addresses for faster checkout. You can save up to {MAX_ADDRESSES} addresses.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          {showForm ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{editingId ? "Edit Address" : "Add New Address"}</Text>
              <View style={styles.labelRow}>
                {ADDRESS_LABELS.map((label) => (
                  <Pressable
                    key={label}
                    onPress={() => setForm((current) => ({ ...current, label }))}
                    style={[styles.chip, form.label === label ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, form.label === label ? styles.chipTextActive : null]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Field
                label="Full Name *"
                value={form.name}
                onChangeText={(name) => setForm((current) => ({ ...current, name }))}
                autoCapitalize="words"
              />
              <Field
                label="Phone *"
                value={form.phone}
                onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
                keyboardType="phone-pad"
              />
              <Field
                label="Address Line 1 *"
                value={form.line1}
                onChangeText={(line1) => setForm((current) => ({ ...current, line1 }))}
              />
              <Field
                label="Address Line 2"
                value={form.line2}
                onChangeText={(line2) => setForm((current) => ({ ...current, line2 }))}
              />
              <Field
                label="City *"
                value={form.city}
                onChangeText={(city) => setForm((current) => ({ ...current, city }))}
              />
              <Field
                label="State *"
                value={form.state}
                onChangeText={(state) => setForm((current) => ({ ...current, state }))}
              />
              <Field
                label="Pincode *"
                value={form.pincode}
                onChangeText={(pincode) => setForm((current) => ({ ...current, pincode }))}
                keyboardType="numeric"
              />
              <Pressable
                onPress={() => setForm((current) => ({ ...current, is_default: !current.is_default }))}
                style={styles.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.is_default }}
              >
                <View style={[styles.checkbox, form.is_default ? styles.checkboxOn : null]} />
                <Text style={styles.checkLabel}>Set as default address</Text>
              </Pressable>
              <PrimaryButton
                label={saving ? "Saving…" : "Save Address"}
                onPress={() => void save()}
                disabled={saving}
              />
              <PrimaryButton label="Cancel" variant="outline" onPress={closeForm} />
            </View>
          ) : null}

          {!addresses.length && !showForm ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.copy}>Save addresses for faster checkout</Text>
              {canAddMore ? <PrimaryButton label="Add New Address" onPress={openAdd} /> : null}
            </View>
          ) : (
            <>
              {addresses.map((address) => (
                <View key={address.id} style={styles.card}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.badge}>{address.label || "Home"}</Text>
                    {address.is_default ? <Text style={styles.defaultBadge}>Default</Text> : null}
                  </View>
                  <Text style={styles.name}>{address.name}</Text>
                  <Text style={styles.meta}>{address.phone}</Text>
                  <Text style={styles.meta}>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </Text>
                  <Text style={styles.meta}>
                    {address.city}, {address.state} — {address.pincode}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(address)} style={styles.actionBtn}>
                      <Text style={styles.actionText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => remove(address.id)} style={styles.actionBtn}>
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </Pressable>
                    {!address.is_default ? (
                      <Pressable onPress={() => void setDefault(address)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>Set as Default</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
              {canAddMore && !showForm ? (
                <PrimaryButton label="Add New Address" onPress={openAdd} />
              ) : !canAddMore ? (
                <Text style={styles.copy}>Maximum of 5 saved addresses reached.</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </AccountStackFrame>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontFamily: Brand.displayFont, fontSize: 20, color: Brand.maroon },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontFamily: Brand.displayFont, fontSize: 20, color: Brand.maroon },
  name: { fontWeight: "700", color: Brand.ink, fontSize: 16 },
  meta: { color: Brand.muted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    borderRadius: 999,
    backgroundColor: Brand.blush,
    color: Brand.maroon,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  defaultBadge: {
    borderRadius: 999,
    backgroundColor: "#F4E7C3",
    color: Brand.goldDeep,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  actionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.maroon,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { color: Brand.maroon, fontWeight: "700", fontSize: 12 },
  deleteText: { color: "#9B1C1C" },
  labelRow: { flexDirection: "row", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: Brand.maroon, borderColor: Brand.maroon },
  chipText: { color: Brand.muted, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: Brand.white },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Brand.maroon,
    backgroundColor: Brand.white,
  },
  checkboxOn: { backgroundColor: Brand.maroon },
  checkLabel: { color: Brand.ink, fontSize: 14 },
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
