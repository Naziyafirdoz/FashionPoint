import { STORE_NAME, STORE_ADDRESS_SHORT, STORE_PHONE_PRIMARY_DISPLAY } from "@/lib/site-config";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-4xl font-bold text-primary">About {STORE_NAME}</h1>
      <p className="mt-6 text-foreground/80">
        We craft premium readymade Indian blouses with AI-powered fit and style guidance — trusted by
        50,000+ happy customers across India.
      </p>
      <p className="mt-4 text-sm text-foreground/70">
        Visit us at {STORE_ADDRESS_SHORT} · Call {STORE_PHONE_PRIMARY_DISPLAY}
      </p>
    </div>
  );
}
