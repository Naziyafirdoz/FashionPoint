import { LegalPage } from "@/components/legal/LegalPage";
import { getStoreInformation } from "@/lib/settings/store-information";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPolicyPage() {
  const { storeName } = await getStoreInformation();

  return (
    <LegalPage title="Privacy Policy">
      <p>{storeName} respects your privacy. We collect information you provide during checkout, account registration, and AI feature usage to improve your shopping experience.</p>
      <p>We do not sell your personal data. Payment processing is handled securely via Razorpay.</p>
    </LegalPage>
  );
}
