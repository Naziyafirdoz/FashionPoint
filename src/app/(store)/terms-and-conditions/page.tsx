import { LegalPage } from "@/components/legal/LegalPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions">
      <p>By using {SITE_URL.replace(/^https?:\/\//, "")} you agree to our terms of sale, return policy, and acceptable use guidelines.</p>
    </LegalPage>
  );
}
