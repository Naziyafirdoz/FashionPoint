import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import { MeasurementsView } from "@/components/account/MeasurementsView";

export const metadata = { title: "My Measurements" };

export default async function AccountMeasurementsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/measurements");

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "bust_measurement, underbust_measurement, waist_measurement, shoulder_measurement, height_cm, weight_kg"
    )
    .eq("id", user.id)
    .maybeSingle();

  const measurements = {
    bust_measurement: customer?.bust_measurement ?? null,
    underbust_measurement: customer?.underbust_measurement ?? null,
    waist_measurement: customer?.waist_measurement ?? null,
    shoulder_measurement: customer?.shoulder_measurement ?? null,
    height_cm: customer?.height_cm ?? null,
    weight_kg: customer?.weight_kg ?? null
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/account/dashboard" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">My Measurements</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Save your body measurements for accurate size recommendations.
      </p>
      <MeasurementsView measurements={measurements} />
    </div>
  );
}
