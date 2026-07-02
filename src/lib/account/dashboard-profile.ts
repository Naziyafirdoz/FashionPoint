import { hasMeasurements } from "@/lib/auth/helpers";

type CustomerRow = {
  full_name?: string | null;
  phone?: string | null;
  bust_measurement?: number | null;
  waist_measurement?: number | null;
  shoulder_measurement?: number | null;
} | null;

export type DashboardProfileStatus = {
  percent: number;
  emailVerified: boolean;
  measurementsSaved: boolean;
  addressAdded: boolean;
  profileComplete: boolean;
  hasName: boolean;
  hasPhone: boolean;
};

export function computeDashboardProfileStatus(
  customer: CustomerRow,
  emailConfirmedAt?: string | null,
  addressesCount = 0
): DashboardProfileStatus {
  const hasName = Boolean(customer?.full_name?.trim());
  const hasPhone = Boolean(customer?.phone?.trim());
  const emailVerified = Boolean(emailConfirmedAt);
  const measurementsSaved = hasMeasurements(customer);
  const addressAdded = addressesCount > 0;

  const checks = [hasName, hasPhone, emailVerified, measurementsSaved, addressAdded];
  const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    percent,
    emailVerified,
    measurementsSaved,
    addressAdded,
    profileComplete: percent === 100,
    hasName,
    hasPhone
  };
}

export function getDisplayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return "FP";
}

export function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
