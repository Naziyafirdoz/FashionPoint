import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import {
  computeDashboardProfileStatus,
  getDisplayInitials
} from "@/lib/account/dashboard-profile";
import { DashboardShell } from "@/components/account/dashboard/DashboardShell";

export const metadata = { title: "My Account" };

export default async function AccountDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/dashboard");

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
    phone: (user.user_metadata?.phone as string | undefined) ?? undefined
  });

  const [{ data: customer }, ordersCountResult, wishlistCountResult, addressesCountResult] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("id", { count: "estimated", head: true }).eq("user_id", user.id),
      supabase.from("wishlist").select("id", { count: "estimated", head: true }).eq("user_id", user.id),
      supabase.from("addresses").select("id", { count: "estimated", head: true }).eq("customer_id", user.id)
    ]);

  const displayName =
    customer?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  const profile = computeDashboardProfileStatus(
    customer,
    user.email_confirmed_at,
    addressesCountResult.count ?? 0
  );

  return (
    <DashboardShell
      displayName={displayName}
      email={user.email ?? ""}
      avatarUrl={customer?.avatar_url ?? null}
      initials={getDisplayInitials(displayName)}
      profile={profile}
      ordersCount={ordersCountResult.count ?? 0}
      wishlistCount={wishlistCountResult.count ?? 0}
      addressesCount={addressesCountResult.count ?? 0}
    />
  );
}
