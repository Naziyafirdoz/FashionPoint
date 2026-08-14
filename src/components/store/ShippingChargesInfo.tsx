import type { ShippingQuote } from "@/lib/shipping/rates";
import type { ShippingTier } from "@/lib/shipping/branch-types";
import {
  SHIPPING_FEES_FOOTNOTE,
  formatShippingCharge,
  getShippingRateCardForAddress,
  getShippingRateCardForBranch
} from "@/lib/shipping/display";
import type { ShippingAddressInput } from "@/lib/shipping/city-detection";

type ShippingChargesInfoProps = {
  quote?: Pick<
    ShippingQuote,
    "shippingAmount" | "tier" | "chargeReason" | "branchName" | "branchId"
  > | null;
  address?: ShippingAddressInput | null;
  className?: string;
};

export function ShippingChargesInfo({ quote, address, className = "" }: ShippingChargesInfoProps) {
  const card = quote?.branchId
    ? {
        branchName: quote.branchName,
        rates: getShippingRateCardForBranch(quote.branchId)
      }
    : getShippingRateCardForAddress(address);

  const activeTier: ShippingTier | null = quote?.tier ?? null;

  return (
    <div
      className={`rounded-xl border border-primary/15 bg-blush/30 px-4 py-3 text-sm ${className}`}
      role="region"
      aria-label="Shipping charges information"
    >
      <p className="font-semibold text-primary">Shipping Charges</p>
      <p className="mt-1 text-xs text-foreground/60">{card.branchName} Branch</p>

      <ul className="mt-3 space-y-1.5 text-foreground/80">
        {card.rates.map((row) => {
          const isActive = activeTier === row.tier;
          return (
            <li
              key={row.tier}
              className={`flex items-start gap-2 ${isActive ? "font-medium text-primary" : ""}`}
            >
              <span className="mt-0.5 text-primary" aria-hidden>
                •
              </span>
              <span>
                {row.label}: {formatShippingCharge(row.amount)}
                {isActive && quote ? (
                  <span className="ml-1 text-xs font-normal text-foreground/60">(applies to you)</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-foreground/60">{SHIPPING_FEES_FOOTNOTE}</p>

      {quote && quote.shippingAmount > 0 ? (
        <div className="mt-3 border-t border-primary/10 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground/70">Your shipping charge</span>
            <span className="text-base font-bold text-primary">
              {formatShippingCharge(quote.shippingAmount)}
            </span>
          </div>
          {quote.chargeReason ? (
            <p className="mt-1.5 text-xs text-foreground/60">{quote.chargeReason}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
