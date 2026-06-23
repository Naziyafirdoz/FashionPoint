/**
 * Admin contact configuration for notifications (email, WhatsApp, push).
 * Values must come from environment variables — never hardcode contacts in source.
 */

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Normalize one comma-separated email entry (plain, mailto:, or markdown link). */
export function normalizeEmailEntry(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const markdownMatch = /^\[([^\]]+)\]\(mailto:([^)]+)\)$/i.exec(trimmed);
  if (markdownMatch) {
    const mailto = markdownMatch[2].trim();
    const label = markdownMatch[1].trim();
    return mailto || label || null;
  }

  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return trimmed.slice(7).trim() || null;
  }

  return trimmed;
}

/** Parse comma-separated emails — trims, ignores empty values, supports markdown links. */
export function parseCommaSeparatedEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(",")) {
    const normalized = normalizeEmailEntry(part);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(normalized);
  }

  return emails;
}

/** Admin inbox for order alerts and system emails. */
export function getAdminEmail(): string | undefined {
  const raw = trimEnv(process.env.ADMIN_EMAIL);
  if (!raw) return undefined;
  return normalizeEmailEntry(raw) ?? undefined;
}

/** Optional worker inboxes for new-order alerts (comma-separated). */
export function getWorkerEmails(): string[] {
  return parseCommaSeparatedEmails(process.env.WORKER_EMAILS);
}

/** Admin + worker recipients for staff order alert emails. */
export function getStaffOrderAlertEmails(): string[] {
  const emails = new Set<string>();
  const admin = getAdminEmail();
  if (admin) emails.add(admin);
  for (const worker of getWorkerEmails()) emails.add(worker);
  return [...emails];
}

/** Admin mobile digits only (no country code prefix required). */
export function getAdminPhoneDigits(): string | undefined {
  const raw = trimEnv(process.env.ADMIN_PHONE);
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  return digits || undefined;
}

/**
 * Twilio WhatsApp destination for admin alerts.
 * Prefers ADMIN_WHATSAPP_TO when set; otherwise builds from ADMIN_PHONE.
 */
export function getAdminWhatsAppTo(): string | undefined {
  const explicit = trimEnv(process.env.ADMIN_WHATSAPP_TO);
  if (explicit) return explicit;

  const digits = getAdminPhoneDigits();
  if (!digits) return undefined;

  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `whatsapp:+${withCountry}`;
}

/** mailto: subject for web-push VAPID. */
export function getAdminMailtoSubject(): string {
  const email = getAdminEmail();
  return email ? `mailto:${email}` : "mailto:admin@localhost";
}

export function getTwilioWhatsAppFrom(): string | undefined {
  return (
    trimEnv(process.env.TWILIO_WHATSAPP_NUMBER) ??
    trimEnv(process.env.TWILIO_WHATSAPP_FROM)
  );
}

export function isAdminNotificationConfigured(): {
  email: boolean;
  whatsapp: boolean;
} {
  return {
    email: Boolean(getAdminEmail() && process.env.RESEND_API_KEY),
    whatsapp: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        getTwilioWhatsAppFrom() &&
        getAdminWhatsAppTo()
    )
  };
}
