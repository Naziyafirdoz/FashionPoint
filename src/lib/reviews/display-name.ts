export type CustomerNameInput = {
  full_name?: string | null;
  email?: string | null;
};

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatFullNamePrivacy(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const token = local.split(/[._+-]/).filter(Boolean)[0] ?? local;
  return token ? capitalizeWord(token) : "";
}

/** Storefront: privacy-friendly abbreviated names. */
export function formatCustomerDisplayName(customer?: CustomerNameInput | null): string {
  if (!customer) return "Guest Review";

  const fullName = customer.full_name?.trim();
  if (fullName) {
    const formatted = formatFullNamePrivacy(fullName);
    if (formatted) return formatted;
  }

  const email = customer.email?.trim();
  if (email) {
    const fromEmail = nameFromEmail(email);
    if (fromEmail) return fromEmail;
  }

  return "Guest Review";
}

/** Admin: full customer name when available. */
export function formatAdminCustomerName(customer?: CustomerNameInput | null): string {
  if (!customer) return "Guest Review";

  const fullName = customer.full_name?.trim();
  if (fullName) return fullName;

  const email = customer.email?.trim();
  if (email) {
    const fromEmail = nameFromEmail(email);
    if (fromEmail) return fromEmail;
  }

  return "Guest Review";
}
