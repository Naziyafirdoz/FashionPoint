import { getAdminWhatsAppTo, getTwilioWhatsAppFrom } from "@/lib/admin/admin-contacts";

export async function sendWhatsAppNotification(message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = getTwilioWhatsAppFrom();
  const to = getAdminWhatsAppTo();

  if (!sid || !token || !from || !to) {
    console.warn(
      "[whatsapp] Twilio not configured (TWILIO_*, TWILIO_WHATSAPP_NUMBER, ADMIN_PHONE)"
    );
    return { ok: false, reason: "not_configured" };
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  const fromAddress = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  await client.messages.create({ from: fromAddress, to, body: message });
  return { ok: true };
}
