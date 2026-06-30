import Link from "next/link";
import {
  COPYRIGHT_NOTICE,
  STORE_ADDRESS,
  STORE_PHONE_PRIMARY_DISPLAY,
  STORE_TEL_PRIMARY,
  STORE_WHATSAPP_URL,
  SUPPORT_EMAIL
} from "@/lib/site-config";
import { BrandLockup } from "@/components/BrandLockup";

export function Footer() {
  return (
    <footer className="mt-0 border-t border-accent/20 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <BrandLockup variant="dark" compactOnMobile={false} />
          <p className="mt-3 text-sm text-foreground/70">
            Premium readymade Indian blouses — daily wear, designer & party collections.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-primary">Shop</h4>
          <ul className="mt-2 space-y-1 text-sm text-foreground/70">
            <li><Link href="/products">All Products</Link></li>
            <li><Link href="/daily-wear">Daily Wear</Link></li>
            <li><Link href="/designer-wear">Designer Wear</Link></li>
            <li><Link href="/party-wear">Party Wear</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-primary">Policies</h4>
          <ul className="mt-2 space-y-1 text-sm text-foreground/70">
            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/terms-and-conditions">Terms &amp; Conditions</Link></li>
            <li><Link href="/shipping-policy">Shipping Policy</Link></li>
            <li><Link href="/size-guide">Size Guide</Link></li>
            <li><Link href="/return-policy">No Return</Link></li>
            <li><Link href="/return-policy">No Exchange</Link></li>
            <li><Link href="/return-policy">No Refund</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-primary">Contact</h4>
          <p className="mt-2 text-sm text-foreground/70">
            {STORE_ADDRESS}
            <br />
            <a href={STORE_TEL_PRIMARY}>{STORE_PHONE_PRIMARY_DISPLAY}</a>
            <br />
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </div>
      <div className="border-t border-accent/20 py-4 text-center text-xs text-foreground/60">
        {COPYRIGHT_NOTICE}
      </div>
      <a
        href={STORE_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </footer>
  );
}
