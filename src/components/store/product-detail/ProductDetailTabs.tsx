"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ProductReviewsPanel } from "@/components/reviews/ProductReviewsPanel";
import { getSizeChartRows } from "@/config/size-chart";
import {
  FINAL_SALE_POLICY_SUMMARY,
  FINAL_SALE_POLICY_TITLE,
  FINAL_SALE_SUPPORT_NOTE
} from "@/lib/store-policy";
import { SHIPPING_BEFORE_ADDRESS_MESSAGE } from "@/lib/shipping/display";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import type { Product } from "@/types";

const TAB_PANEL =
  "max-w-3xl text-[17px] leading-[1.85] text-[#4A4A4A] [&_h3]:mb-2.5 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#2A2A2A] [&_li]:ml-5 [&_li]:list-disc [&_ol]:list-decimal [&_p+p]:mt-4 [&_ul]:space-y-2";

const TAB_NAV_BTN =
  "relative whitespace-nowrap px-3 py-3.5 text-[15px] font-semibold tracking-[0.01em] transition-colors duration-200 md:px-4 md:py-4";

const DETAIL_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-[#9A7A82]";

const DETAIL_VALUE =
  "mt-1 text-[15px] font-medium leading-snug text-[#2A2A2A]";

const INFO_CARD =
  "flex h-full flex-col rounded-[15px] border border-[#EDE0E4] bg-[#FFFBFC] p-4 shadow-[0_2px_12px_rgba(122,13,43,0.05)] sm:p-5";

const INFO_CARD_TITLE =
  "text-xs font-semibold uppercase tracking-[0.1em] text-primary";

const INFO_CARD_BODY = "mt-2.5 text-[15px] leading-[1.75] text-[#4A4A4A]";

const SIZE_ROWS = getSizeChartRows();

type DetailField = {
  label: string;
  value?: string | null;
};

type ProductDetailTabsProps = {
  product: Product;
  sku?: string | null;
  reviewSummary: ProductReviewSummary;
  onSummaryChange: (summary: ProductReviewSummary) => void;
};

function buildDetailFields(product: Product, sku?: string | null): DetailField[] {
  return [
    { label: "SKU", value: sku },
    {
      label: "Occasion",
      value: product.occasion?.length ? product.occasion.join(", ") : undefined
    },
    { label: "Tags", value: product.tags?.length ? product.tags.join(", ") : undefined }
  ].filter((field) => field.value);
}

function DescriptionContent({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 320;
  const displayText = !isLong || expanded ? text : `${text.slice(0, 320).trim()}…`;

  return (
    <div className="max-w-prose">
      <p className="whitespace-pre-line">{displayText}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export function ProductDetailTabs({
  product,
  sku,
  reviewSummary,
  onSummaryChange
}: ProductDetailTabsProps) {
  const [tab, setTab] = useState("DESCRIPTION");

  const tabs = useMemo(
    () => [
      { id: "DESCRIPTION", label: "Description" },
      { id: "DETAILS", label: "Details" },
      { id: "SIZE", label: "Size Guide" },
      { id: "SHIPPING", label: "Shipping" },
      { id: "REVIEWS", label: `Reviews (${reviewSummary.review_count})` }
    ],
    [reviewSummary.review_count]
  );

  const detailFields = buildDetailFields(product, sku);
  const descriptionText = product.detailed_description ?? product.short_description ?? "";

  return (
    <div className="mt-10 border-t border-[#F3E5E8] pt-2">
      <div className="sticky top-[72px] z-20 -mx-4 border-b border-[#F3E5E8] bg-[#FFFBF9]/95 px-4 backdrop-blur-sm sm:top-20">
        <div
          className="flex gap-5 overflow-x-auto scrollbar-none md:gap-8"
          role="tablist"
          aria-label="Product information"
        >
          {tabs.map((entry) => {
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={`${TAB_NAV_BTN} ${
                  active ? "text-primary" : "text-[#666666] hover:text-primary/80"
                }`}
              >
                {entry.label}
                {active ? (
                  <motion.span
                    layoutId="pdp-tab-underline"
                    className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={tab}
        role="tabpanel"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={`py-6 sm:py-7 ${TAB_PANEL}`}
      >
        {tab === "DESCRIPTION" &&
          (descriptionText ? (
            <DescriptionContent text={descriptionText} />
          ) : (
            <p className="text-[15px] text-[#666666]">No description available for this product.</p>
          ))}

        {tab === "DETAILS" &&
          (detailFields.length > 0 ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {detailFields.map((field) => (
                <div key={field.label} className={`${INFO_CARD} min-h-[5.5rem]`}>
                  <dt className={DETAIL_LABEL}>{field.label}</dt>
                  <dd className={DETAIL_VALUE}>{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[15px] text-[#666666]">
              No additional specifications available for this product.
            </p>
          ))}

        {tab === "SIZE" && (
          <div className="max-w-2xl space-y-4">
            <p className="text-[15px] leading-[1.75]">
              Refer to our{" "}
              <Link
                href="/size-guide"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                full size guide
              </Link>{" "}
              or use the{" "}
              <Link
                href="/ai-features/size-finder"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                AI Size Finder
              </Link>{" "}
              for personalized fit guidance.
            </p>
            <div className="overflow-x-auto rounded-[15px] border border-[#EDE0E4] bg-white shadow-[0_2px_12px_rgba(122,13,43,0.05)]">
              <table className="w-full min-w-[320px] text-[15px]">
                <thead>
                  <tr className="border-b border-[#F3E5E8] bg-[#FFF5F7] text-left text-primary">
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.08em]">
                      Size
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.08em]">
                      Bust (in)
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.08em]">
                      Waist (in)
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.08em]">
                      Shoulder (in)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_ROWS.map((row) => (
                    <tr key={row.name} className="border-b border-[#F3E5E8] last:border-0">
                      <td className="px-4 py-3 font-medium text-[#2A2A2A]">{row.name}</td>
                      <td className="px-4 py-3 text-[#4A4A4A]">{row.bust}</td>
                      <td className="px-4 py-3 text-[#4A4A4A]">{row.waist}</td>
                      <td className="px-4 py-3 text-[#4A4A4A]">{row.shoulder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "SHIPPING" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <article className={INFO_CARD}>
              <h3 className={INFO_CARD_TITLE}>Checkout &amp; Delivery</h3>
              <p className={INFO_CARD_BODY}>{SHIPPING_BEFORE_ADDRESS_MESSAGE}</p>
              <p className={`${INFO_CARD_BODY} mt-3`}>
                Enter your full delivery address during checkout to see the applicable shipping
                charge and estimated delivery window for your location. Tracking details are shared
                once your parcel is booked.
              </p>
            </article>
            <article className={INFO_CARD}>
              <h3 className={INFO_CARD_TITLE}>{FINAL_SALE_POLICY_TITLE}</h3>
              <p className={`${INFO_CARD_BODY} font-medium text-[#2A2A2A]`}>
                {FINAL_SALE_POLICY_SUMMARY}
              </p>
              <p className={`${INFO_CARD_BODY} mt-3`}>{FINAL_SALE_SUPPORT_NOTE}</p>
              <Link
                href="/return-policy"
                className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                View return policy
              </Link>
            </article>
          </div>
        )}

        {tab === "REVIEWS" && (
          <ProductReviewsPanel
            productId={product.id}
            productName={product.name}
            onSummaryChange={onSummaryChange}
          />
        )}
      </motion.div>
    </div>
  );
}
