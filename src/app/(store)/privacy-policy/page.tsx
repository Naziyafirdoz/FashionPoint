import { LegalPage } from "@/components/legal/LegalPage";
import { STORE_NAME } from "@/lib/site-config";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>{STORE_NAME} respects your privacy. We collect information you provide during checkout, account registration, and AI feature usage to improve your shopping experience.</p>
      <p>We do not sell your personal data. Payment processing is handled securely via Razorpay.</p>
    </LegalPage>
  );
}
