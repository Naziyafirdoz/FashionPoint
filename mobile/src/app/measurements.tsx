import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { Field, PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import {
  emptyMeasurements,
  fetchCustomerMeasurements,
  formatBodyMeasurement,
  formatHeight,
  formatWeight,
  hasSavedMeasurements,
  parseBodyMeasurement,
  parseHeight,
  parseWeight,
  toDisplayHeight,
  toDisplayInches,
  toDisplayWeight,
  updateCustomerMeasurements,
  type CustomerMeasurements,
} from "@/lib/account";
import { toUserMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function MeasurementsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<CustomerMeasurements>(emptyMeasurements());
  const [lengthUnit, setLengthUnit] = useState<"inch" | "cm">("inch");
  const [heightUnit, setHeightUnit] = useState<"cm" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [bust, setBust] = useState("");
  const [underbust, setUnderbust] = useState("");
  const [waist, setWaist] = useState("");
  const [shoulder, setShoulder] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMeasurements(await fetchCustomerMeasurements());
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Unable to load measurements."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const changeLengthUnit = (unit: "inch" | "cm") => {
    setLengthUnit(unit);
    setBust(toDisplayInches(measurements.bust_measurement, unit));
    setUnderbust(toDisplayInches(measurements.underbust_measurement, unit));
    setWaist(toDisplayInches(measurements.waist_measurement, unit));
    setShoulder(toDisplayInches(measurements.shoulder_measurement, unit));
  };

  const changeHeightUnit = (unit: "cm" | "inch") => {
    setHeightUnit(unit);
    setHeight(toDisplayHeight(measurements.height_cm, unit));
  };

  const changeWeightUnit = (unit: "kg" | "lb") => {
    setWeightUnit(unit);
    setWeight(toDisplayWeight(measurements.weight_kg, unit));
  };

  const startEditing = () => {
    setBust(toDisplayInches(measurements.bust_measurement, lengthUnit));
    setUnderbust(toDisplayInches(measurements.underbust_measurement, lengthUnit));
    setWaist(toDisplayInches(measurements.waist_measurement, lengthUnit));
    setShoulder(toDisplayInches(measurements.shoulder_measurement, lengthUnit));
    setHeight(toDisplayHeight(measurements.height_cm, heightUnit));
    setWeight(toDisplayWeight(measurements.weight_kg, weightUnit));
    setSuccess(null);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = await updateCustomerMeasurements({
        bust_measurement: parseBodyMeasurement(bust, lengthUnit),
        underbust_measurement: parseBodyMeasurement(underbust, lengthUnit),
        waist_measurement: parseBodyMeasurement(waist, lengthUnit),
        shoulder_measurement: parseBodyMeasurement(shoulder, lengthUnit),
        height_cm: parseHeight(height, heightUnit),
        weight_kg: parseWeight(weight, weightUnit),
      });
      setMeasurements(next);
      setBust(toDisplayInches(next.bust_measurement, lengthUnit));
      setUnderbust(toDisplayInches(next.underbust_measurement, lengthUnit));
      setWaist(toDisplayInches(next.waist_measurement, lengthUnit));
      setShoulder(toDisplayInches(next.shoulder_measurement, lengthUnit));
      setHeight(toDisplayHeight(next.height_cm, heightUnit));
      setWeight(toDisplayWeight(next.weight_kg, weightUnit));
      setSuccess("Measurements saved successfully.");
      setEditing(false);
    } catch (err) {
      setError(toUserMessage(err, "Unable to update measurements."));
    } finally {
      setSaving(false);
    }
  };

  const saved = hasSavedMeasurements(measurements);

  return (
    <AccountStackFrame title="My Measurements">
      {!user ? (
        <StatusMessage
          title="Sign in required"
          message="Sign in to save your measurements."
          actionLabel="Sign in"
          onAction={() => router.push("/login?redirect=/measurements" as Href)}
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
          <Text style={styles.copy}>Save your body measurements for accurate size recommendations.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          {!saved && !editing ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No measurements saved yet</Text>
              <Text style={styles.copy}>Add your measurements to get perfect size recommendations</Text>
              <PrimaryButton label="Add Measurements" onPress={startEditing} />
            </View>
          ) : editing ? (
            <>
              <UnitToggle
                label="Body measurements"
                value={lengthUnit}
                options={[
                  { value: "inch", label: "Inches" },
                  { value: "cm", label: "cm" },
                ]}
                onChange={changeLengthUnit}
              />
              <UnitToggle
                label="Height"
                value={heightUnit}
                options={[
                  { value: "cm", label: "cm" },
                  { value: "inch", label: "inches" },
                ]}
                onChange={changeHeightUnit}
              />
              <UnitToggle
                label="Weight"
                value={weightUnit}
                options={[
                  { value: "kg", label: "kg" },
                  { value: "lb", label: "lbs" },
                ]}
                onChange={changeWeightUnit}
              />
              <Text style={styles.legend}>
                Body measurements ({lengthUnit === "inch" ? "inches" : "cm"})
              </Text>
              <Field label="Bust" value={bust} onChangeText={setBust} keyboardType="decimal-pad" />
              <Field
                label="Underbust"
                value={underbust}
                onChangeText={setUnderbust}
                keyboardType="decimal-pad"
              />
              <Field label="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" />
              <Field
                label="Shoulder"
                value={shoulder}
                onChangeText={setShoulder}
                keyboardType="decimal-pad"
              />
              <Field
                label={`Height (${heightUnit === "cm" ? "cm" : "inches"})`}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
              />
              <Field
                label={`Weight (${weightUnit === "kg" ? "kg" : "lbs"})`}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
              <PrimaryButton
                label={saving ? "Saving…" : "Save Measurements"}
                onPress={() => void save()}
                disabled={saving}
              />
              <PrimaryButton
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setBust(toDisplayInches(measurements.bust_measurement, lengthUnit));
                  setUnderbust(toDisplayInches(measurements.underbust_measurement, lengthUnit));
                  setWaist(toDisplayInches(measurements.waist_measurement, lengthUnit));
                  setShoulder(toDisplayInches(measurements.shoulder_measurement, lengthUnit));
                  setHeight(toDisplayHeight(measurements.height_cm, heightUnit));
                  setWeight(toDisplayWeight(measurements.weight_kg, weightUnit));
                  setEditing(false);
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Your Measurements</Text>
                  <Pressable onPress={startEditing} accessibilityRole="button">
                    <Text style={styles.editLink}>Edit</Text>
                  </Pressable>
                </View>
                <UnitToggle
                  label="Body"
                  value={lengthUnit}
                  options={[
                    { value: "inch", label: "Inches" },
                    { value: "cm", label: "cm" },
                  ]}
                  onChange={setLengthUnit}
                />
                <UnitToggle
                  label="Height"
                  value={heightUnit}
                  options={[
                    { value: "cm", label: "Height cm" },
                    { value: "inch", label: "Height in" },
                  ]}
                  onChange={setHeightUnit}
                />
                <UnitToggle
                  label="Weight"
                  value={weightUnit}
                  options={[
                    { value: "kg", label: "kg" },
                    { value: "lb", label: "lbs" },
                  ]}
                  onChange={setWeightUnit}
                />
                <MeasurementRow label="Bust" value={formatBodyMeasurement(measurements.bust_measurement, lengthUnit)} />
                <MeasurementRow
                  label="Underbust"
                  value={formatBodyMeasurement(measurements.underbust_measurement, lengthUnit)}
                />
                <MeasurementRow label="Waist" value={formatBodyMeasurement(measurements.waist_measurement, lengthUnit)} />
                <MeasurementRow
                  label="Shoulder"
                  value={formatBodyMeasurement(measurements.shoulder_measurement, lengthUnit)}
                />
                <MeasurementRow label="Height" value={formatHeight(measurements.height_cm, heightUnit)} />
                <MeasurementRow label="Weight" value={formatWeight(measurements.weight_kg, weightUnit)} />
              </View>
              <PrimaryButton
                label="Try AI Size Finder"
                variant="outline"
                onPress={() => router.push("/ai/size" as Href)}
              />
            </>
          )}
        </ScrollView>
      )}
    </AccountStackFrame>
  );
}

function MeasurementRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.measureRow}>
      <Text style={styles.measureLabel}>{label}</Text>
      <Text style={styles.measureValue}>{value}</Text>
    </View>
  );
}

function UnitToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      <Text style={styles.toggleCaption}>{label}</Text>
      <View style={styles.toggle}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.toggleOption, value === option.value ? styles.toggleActive : null]}
          >
            <Text style={[styles.toggleText, value === option.value ? styles.toggleTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, fontSize: 14, lineHeight: 20 },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 20,
    color: Brand.maroon,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: Brand.displayFont, fontSize: 20, color: Brand.maroon },
  editLink: { color: Brand.maroon, fontWeight: "700" },
  legend: { fontSize: 13, fontWeight: "700", color: Brand.maroon },
  measureRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.blush,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  measureLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Brand.muted,
  },
  measureValue: { marginTop: 4, fontSize: 14, fontWeight: "600", color: Brand.ink },
  toggleWrap: { gap: 6 },
  toggleCaption: { fontSize: 12, color: Brand.muted },
  toggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 2,
  },
  toggleOption: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  toggleActive: { backgroundColor: Brand.maroon },
  toggleText: { fontSize: 12, color: Brand.muted, fontWeight: "600" },
  toggleTextActive: { color: Brand.white },
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
