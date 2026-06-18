import { LegalPage } from "@/components/legal/LegalPage";
import {
  FINAL_SALE_POLICY_TITLE,
  FINAL_SALE_POLICY_SUMMARY,
  FINAL_SALE_SUPPORT_NOTE
} from "@/lib/store-policy";

export const metadata = { title: FINAL_SALE_POLICY_TITLE };

export default function ReturnPolicyPage() {
  return (
    <LegalPage title={FINAL_SALE_POLICY_TITLE}>
      <p className="font-medium text-foreground">{FINAL_SALE_POLICY_SUMMARY}</p>
      <p className="mt-4">
        Please review product details, images, size information, and shipping details carefully
        before placing your order.
      </p>
      <p className="mt-4">
        By placing an order, the customer acknowledges and accepts this policy.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-foreground">Customer support</h2>
      <p className="mt-2">{FINAL_SALE_SUPPORT_NOTE}</p>
    </LegalPage>
  );
}
