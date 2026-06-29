export const NOTIFICATION_EMAIL_SETTINGS_KEY = "notification_email";

export type NotificationEmailType =
  | "new_order"
  | "low_stock"
  | "cancel_request"
  | "refund_request"
  | "payment_failed"
  | "new_review"
  | "contact_form";

export type NotificationRecipientRow = {
  id: string;
  email: string;
  enabled: boolean;
  notify_new_order: boolean;
  notify_low_stock: boolean;
  notify_cancel_request: boolean;
  notify_refund_request: boolean;
  notify_payment_failed: boolean;
  notify_new_review: boolean;
  notify_contact_form: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationRecipientInput = {
  email: string;
  enabled: boolean;
  notify_new_order: boolean;
  notify_low_stock: boolean;
  notify_cancel_request: boolean;
  notify_refund_request: boolean;
  notify_payment_failed: boolean;
  notify_new_review: boolean;
  notify_contact_form: boolean;
};

export const NOTIFICATION_TYPE_OPTIONS: {
  key: keyof Pick<
    NotificationRecipientInput,
    | "notify_new_order"
    | "notify_low_stock"
    | "notify_cancel_request"
    | "notify_refund_request"
    | "notify_payment_failed"
    | "notify_new_review"
    | "notify_contact_form"
  >;
  label: string;
  type: NotificationEmailType;
}[] = [
  { key: "notify_new_order", label: "New Order", type: "new_order" },
  { key: "notify_low_stock", label: "Low Stock", type: "low_stock" },
  { key: "notify_cancel_request", label: "Cancel Request", type: "cancel_request" },
  { key: "notify_refund_request", label: "Refund Request", type: "refund_request" },
  { key: "notify_payment_failed", label: "Payment Failed", type: "payment_failed" },
  { key: "notify_new_review", label: "New Review", type: "new_review" },
  { key: "notify_contact_form", label: "Contact Form", type: "contact_form" }
];

const EMAIL_TYPE_TO_COLUMN: Record<NotificationEmailType, keyof NotificationRecipientInput> = {
  new_order: "notify_new_order",
  low_stock: "notify_low_stock",
  cancel_request: "notify_cancel_request",
  refund_request: "notify_refund_request",
  payment_failed: "notify_payment_failed",
  new_review: "notify_new_review",
  contact_form: "notify_contact_form"
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LAST_ENABLED_RECIPIENT_ERROR =
  "You must keep at least one enabled notification recipient.";

export function countEnabledRecipients(
  recipients: Pick<NotificationRecipientRow, "enabled">[]
): number {
  return recipients.filter((recipient) => recipient.enabled).length;
}

export function countEnabledRecipientsAfterDelete(
  recipients: NotificationRecipientRow[],
  deleteId: string
): number {
  return recipients.filter((recipient) => recipient.id !== deleteId && recipient.enabled).length;
}

export function countEnabledRecipientsAfterUpdate(
  recipients: NotificationRecipientRow[],
  updateId: string,
  nextEnabled: boolean
): number {
  return recipients.reduce((count, recipient) => {
    if (recipient.id === updateId) return count + (nextEnabled ? 1 : 0);
    return count + (recipient.enabled ? 1 : 0);
  }, 0);
}

export function validateAtLeastOneEnabledRecipient(enabledCount: number): string | null {
  if (enabledCount < 1) return LAST_ENABLED_RECIPIENT_ERROR;
  return null;
}

export function validateRecipientDelete(
  recipients: NotificationRecipientRow[],
  deleteId: string
): string | null {
  const target = recipients.find((recipient) => recipient.id === deleteId);
  if (!target?.enabled) return null;

  return validateAtLeastOneEnabledRecipient(
    countEnabledRecipientsAfterDelete(recipients, deleteId)
  );
}

export function validateRecipientUpdate(
  recipients: NotificationRecipientRow[],
  updateId: string,
  nextEnabled: boolean
): string | null {
  if (nextEnabled) return null;

  const current = recipients.find((recipient) => recipient.id === updateId);
  if (!current?.enabled) return null;

  return validateAtLeastOneEnabledRecipient(
    countEnabledRecipientsAfterUpdate(recipients, updateId, nextEnabled)
  );
}

export function normalizeRecipientEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidRecipientEmail(email: string): boolean {
  const normalized = normalizeRecipientEmail(email);
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

export function recipientHasAnyNotificationType(input: NotificationRecipientInput): boolean {
  return NOTIFICATION_TYPE_OPTIONS.some((option) => input[option.key]);
}

export function getActiveNotificationLabels(recipient: NotificationRecipientRow): string[] {
  return NOTIFICATION_TYPE_OPTIONS.filter((option) => recipient[option.key]).map(
    (option) => option.label
  );
}

export function formatRecipientNotificationsSummary(recipient: NotificationRecipientRow): string {
  const labels = getActiveNotificationLabels(recipient);
  if (labels.length === NOTIFICATION_TYPE_OPTIONS.length) {
    return `All (${NOTIFICATION_TYPE_OPTIONS.length})`;
  }
  return labels.join(", ");
}

export function notificationTypeColumn(type: NotificationEmailType): keyof NotificationRecipientInput {
  return EMAIL_TYPE_TO_COLUMN[type];
}

export function validateNotificationRecipientInput(
  input: Partial<NotificationRecipientInput>,
  options?: { excludeId?: string; existingEmails?: string[] }
): string | null {
  if (typeof input.email !== "string" || !input.email.trim()) {
    return "Recipient email is required";
  }

  const normalized = normalizeRecipientEmail(input.email);
  if (!isValidRecipientEmail(normalized)) {
    return "Enter a valid email address";
  }

  if (options?.existingEmails) {
    const duplicate = options.existingEmails.some(
      (email) => normalizeRecipientEmail(email) === normalized
    );
    if (duplicate) {
      return "A recipient with this email already exists";
    }
  }

  const draft: NotificationRecipientInput = {
    email: normalized,
    enabled: input.enabled ?? true,
    notify_new_order: input.notify_new_order ?? false,
    notify_low_stock: input.notify_low_stock ?? false,
    notify_cancel_request: input.notify_cancel_request ?? false,
    notify_refund_request: input.notify_refund_request ?? false,
    notify_payment_failed: input.notify_payment_failed ?? false,
    notify_new_review: input.notify_new_review ?? false,
    notify_contact_form: input.notify_contact_form ?? false
  };

  if (!recipientHasAnyNotificationType(draft)) {
    return "Select at least one notification type";
  }

  return null;
}

export function normalizeNotificationRecipientInput(
  input: Partial<NotificationRecipientInput>
): NotificationRecipientInput | null {
  if (typeof input.email !== "string") return null;

  return {
    email: normalizeRecipientEmail(input.email),
    enabled: Boolean(input.enabled),
    notify_new_order: Boolean(input.notify_new_order),
    notify_low_stock: Boolean(input.notify_low_stock),
    notify_cancel_request: Boolean(input.notify_cancel_request),
    notify_refund_request: Boolean(input.notify_refund_request),
    notify_payment_failed: Boolean(input.notify_payment_failed),
    notify_new_review: Boolean(input.notify_new_review),
    notify_contact_form: Boolean(input.notify_contact_form)
  };
}
