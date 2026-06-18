export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}

export function isValidFullName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function isValidSecondaryMobile(primary: string, secondary: string): boolean {
  const trimmed = secondary.trim();
  if (!trimmed) return true;
  if (!isValidIndianMobile(trimmed)) return false;
  return normalizeIndianMobile(trimmed) !== normalizeIndianMobile(primary);
}

export type ContactValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

export function validateCheckoutContact(fields: {
  name: string;
  phone: string;
  secondary_phone?: string;
  email: string;
}): ContactValidationResult {
  if (!isValidFullName(fields.name)) {
    return { ok: false, field: "name", message: "Enter your full name (at least first and last name)." };
  }
  if (!isValidIndianMobile(fields.phone)) {
    return {
      ok: false,
      field: "phone",
      message: "Primary mobile must be 10 digits and start with 6, 7, 8, or 9."
    };
  }
  if (!isValidEmail(fields.email)) {
    return { ok: false, field: "email", message: "Enter a valid email address." };
  }
  if (!isValidSecondaryMobile(fields.phone, fields.secondary_phone ?? "")) {
    const secondary = fields.secondary_phone?.trim() ?? "";
    if (secondary && !isValidIndianMobile(secondary)) {
      return {
        ok: false,
        field: "secondary_phone",
        message: "Secondary mobile must be 10 digits and start with 6, 7, 8, or 9."
      };
    }
    return {
      ok: false,
      field: "secondary_phone",
      message: "Secondary mobile cannot be the same as the primary number."
    };
  }
  return { ok: true };
}
