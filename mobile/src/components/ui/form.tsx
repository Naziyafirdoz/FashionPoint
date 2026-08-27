import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Brand } from "@/constants/brand";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "solid",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === "outline" ? styles.outline : styles.solid,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.buttonText, variant === "outline" ? styles.outlineText : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  editable = true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences";
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Brand.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          !editable ? styles.inputLocked : null,
        ]}
      />
    </View>
  );
}

export function StatusMessage({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.status}>
      {title ? <Text style={styles.statusTitle}>{title}</Text> : null}
      <Text style={styles.statusText}>{message}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  solid: {
    backgroundColor: Brand.maroon,
  },
  outline: {
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.maroon,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  outlineText: {
    color: Brand.maroon,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.maroon,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Brand.ink,
  },
  inputLocked: {
    backgroundColor: Brand.blush,
    color: Brand.muted,
  },
  inputMultiline: {
    minHeight: 88,
    paddingVertical: 12,
  },
  status: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 10,
  },
  statusTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 22,
    color: Brand.maroon,
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
    textAlign: "center",
  },
});
