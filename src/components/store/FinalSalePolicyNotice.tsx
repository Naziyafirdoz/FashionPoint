import { FINAL_SALE_CHECKOUT_NOTICE, FINAL_SALE_SUPPORT_NOTE } from "@/lib/store-policy";

type FinalSalePolicyNoticeProps = {
  variant?: "checkout" | "success" | "inline";
  className?: string;
};

export function FinalSalePolicyNotice({
  variant = "inline",
  className = ""
}: FinalSalePolicyNoticeProps) {
  if (variant === "checkout") {
    return (
      <div
        className={`rounded-xl border border-primary/20 bg-blush px-4 py-3 text-sm text-foreground/80 ${className}`}
        role="note"
      >
        <p className="font-semibold text-primary">Important</p>
        <p className="mt-1">{FINAL_SALE_CHECKOUT_NOTICE}</p>
      </div>
    );
  }

  if (variant === "success") {
    return (
      <div
        className={`space-y-3 rounded-xl border border-primary/15 bg-blush/40 px-4 py-3 text-sm text-foreground/80 ${className}`}
        role="note"
      >
        <p>
          Please note that Fashion Point does not offer returns, exchanges, or refunds once an
          order has been placed.
        </p>
        <p>For any delivery issues, please contact customer support.</p>
        <p className="text-xs text-foreground/60">{FINAL_SALE_SUPPORT_NOTE}</p>
      </div>
    );
  }

  return (
    <p className={`text-sm text-foreground/70 ${className}`}>
      {FINAL_SALE_CHECKOUT_NOTICE}
    </p>
  );
}
