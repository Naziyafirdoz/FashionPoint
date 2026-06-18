import Link from "next/link";
import { BrandLockup } from "@/components/BrandLockup";
import { COPYRIGHT_NOTICE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-blush-100 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandLockup variant="dark" compactOnMobile={false} />
            <p className="mt-2 text-sm text-maroon/70 max-w-prose">
              Premium ready‑made blouses with AI‑assisted recommendations and
              sizing. Crafted for elegance, comfort and confidence.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                aria-label="Email"
                placeholder="Email for luxury drops…"
                className="h-11 w-full rounded-full border border-blush-100 bg-white/70 px-4 text-sm outline-none focus:ring-2 focus:ring-roseGold/30"
              />
              <button className="h-11 rounded-full px-5 bg-maroon text-white hover:bg-maroon/90 transition shadow-soft">
                Join
              </button>
            </div>
            <p className="mt-2 text-xs text-maroon/50">
              By subscribing you agree to receive emails from Fashion Point.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-maroon">Shop</div>
            <ul className="mt-3 space-y-2 text-sm text-maroon/70">
              <li>
                <Link href="/category/daily" className="hover:text-maroon">
                  Daily Blouses
                </Link>
              </li>
              <li>
                <Link href="/category/designer" className="hover:text-maroon">
                  Designer Blouses
                </Link>
              </li>
              <li>
                <Link href="/category/new" className="hover:text-maroon">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-maroon">
                  Offers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-maroon">Support</div>
            <ul className="mt-3 space-y-2 text-sm text-maroon/70">
              <li>
                <Link href="/contact" className="hover:text-maroon">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-maroon">
                  Delivery info
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="hover:text-maroon">
                  Returns &amp; Refunds Policy
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-maroon">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs text-maroon/50">
          <div>{COPYRIGHT_NOTICE}</div>
          <div className="flex gap-4">
            <span>Razorpay ready</span>
            <span>UPI</span>
            <span>COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

