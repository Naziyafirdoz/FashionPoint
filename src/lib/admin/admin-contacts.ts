/**
 * Admin contact configuration for notifications (email, WhatsApp, push).
 * Values must come from environment variables — never hardcode contacts in source.
 */

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Admin inbox for order alerts and system emails. */
export function getAdminEmail(): string | undefined {
  return trimEnv(process.env.ADMIN_EMAIL);
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
