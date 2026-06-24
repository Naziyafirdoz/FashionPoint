export type IntegrationName = "Razorpay" | "Resend" | "Twilio" | "Cloudinary";

export type IntegrationStatusItem = {
  name: IntegrationName;
  connected: boolean;
};

export function getIntegrationStatuses(): IntegrationStatusItem[] {
  return [
    {
      name: "Razorpay",
      connected: Boolean(
        process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()
      )
    },
    {
      name: "Resend",
      connected: Boolean(process.env.RESEND_API_KEY?.trim())
    },
    {
      name: "Twilio",
      connected: Boolean(
        process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim()
      )
    },
    {
      name: "Cloudinary",
      connected: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
          process.env.CLOUDINARY_API_KEY?.trim() &&
          process.env.CLOUDINARY_API_SECRET?.trim()
      )
    }
  ];
}

export type PaymentsSettingsStatus = {
  razorpayConfigured: boolean;
  webhookConfigured: boolean;
  manualRefundsEnabled: boolean;
  codDisabled: boolean;
};

export function getPaymentsSettingsStatus(): PaymentsSettingsStatus {
  return {
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID?.trim() &&
        process.env.RAZORPAY_KEY_SECRET?.trim() &&
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim()
    ),
    webhookConfigured: false,
    manualRefundsEnabled: true,
    codDisabled: true
  };
}
