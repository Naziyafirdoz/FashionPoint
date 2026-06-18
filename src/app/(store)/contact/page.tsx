import {
  STORE_ADDRESS,
  SUPPORT_EMAIL,
  STORE_PHONE_PRIMARY_DISPLAY,
  STORE_PHONE_SECONDARY_DISPLAY,
  STORE_TEL_PRIMARY,
  STORE_TEL_SECONDARY,
  STORE_WHATSAPP_URL
} from "@/lib/site-config";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-primary">Contact Us</h1>
      <p className="mt-4 text-foreground/70">{STORE_ADDRESS}</p>
      <p className="mt-4 text-foreground/70">
        Phone: <a href={STORE_TEL_PRIMARY}>{STORE_PHONE_PRIMARY_DISPLAY}</a>
      </p>
      <p className="text-foreground/70">
        Alternate: <a href={STORE_TEL_SECONDARY}>{STORE_PHONE_SECONDARY_DISPLAY}</a>
      </p>
      <p className="text-foreground/70">Email: {SUPPORT_EMAIL}</p>
      <a href={STORE_WHATSAPP_URL} className="btn-primary mt-6 inline-flex">
        WhatsApp Us
      </a>
    </div>
  );
}
