import { ProfileForm } from "@/components/account/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "My Profile" };

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/profile");

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link href="/account/dashboard" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">My Profile</h1>
      <p className="mt-2 text-sm text-foreground/70">Update your details and measurements.</p>
      <div className="card-store mt-8">
        <ProfileForm
          email={user.email ?? ""}
          initial={{
            full_name: customer?.full_name ?? "",
            phone: customer?.phone ?? "",
            bust_measurement: customer?.bust_measurement ?? "",
            waist_measurement: customer?.waist_measurement ?? "",
            shoulder_measurement: customer?.shoulder_measurement ?? "",
            preferred_size: customer?.preferred_size ?? ""
          }}
        />
      </div>
    </div>
  );
}
