import { createClient } from "@/lib/supabase/server";
import { SizeFinderClient } from "@/components/ai/SizeFinderClient";
import { getStoreInformation } from "@/lib/settings/store-information";

export const metadata = { title: "AI Size Finder" };

export default async function SizeFinderPage() {
  const { storeName } = await getStoreInformation();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let savedMeasurements = null;
  let savedSizeProfile = null;

  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select(
        "bust_measurement, underbust_measurement, waist_measurement, shoulder_measurement, recommended_size, preferred_size, fit_preference, sizing_updated_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (customer) {
      savedMeasurements = {
        bust: customer.bust_measurement,
        underbust: customer.underbust_measurement,
        waist: customer.waist_measurement,
        shoulder: customer.shoulder_measurement
      };
      savedSizeProfile = {
        recommended_size: customer.recommended_size,
        preferred_size: customer.preferred_size,
        fit_preference: customer.fit_preference,
        sizing_updated_at: customer.sizing_updated_at
      };
    }
  }

  return (
    <SizeFinderClient
      storeName={storeName}
      savedMeasurements={savedMeasurements}
      savedSizeProfile={savedSizeProfile}
      isLoggedIn={Boolean(user)}
    />
  );
}
