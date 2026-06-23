import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord, hasMeasurements } from "@/lib/auth/helpers";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = { title: "My Account" };

const LINKS = [
  { href: "/account/orders", label: "My Orders" },
  { href: "/wishlist", label: "My Wishlist" },
  { href: "/account/profile", label: "Edit Profile" },
  { href: "/account/measurements", label: "My Measurements" },
  { href: "/account/addresses", label: "Saved Addresses" },
  { href: "/account/ai-history", label: "AI History" }
];

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

  const [{ data: customer }, ordersResult, wishlistResult] = await Promise.all([
    supabase.from("customers").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "estimated", head: true })
      .eq("user_id", user.id),
    supabase
      .from("wishlist")
      .select("id", { count: "estimated", head: true })
      .eq("user_id", user.id)
  ]);

  const displayName =
    customer?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  const ordersCount = ordersResult.count ?? 0;
  const wishlistCount = wishlistResult.count ?? 0;
  const measurementsComplete = hasMeasurements(customer);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            Welcome, {displayName}
          </h1>
          <p className="mt-2 text-foreground/70">{user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card-store text-center">
          <p className="text-3xl font-bold text-primary">{ordersCount}</p>
          <p className="mt-1 text-sm text-foreground/70">Orders</p>
          <Link href="/account/orders" className="mt-2 inline-block text-sm text-primary hover:underline">
            View orders
          </Link>
        </div>
        <div className="card-store text-center">
          <p className="text-3xl font-bold text-primary">{wishlistCount}</p>
          <p className="mt-1 text-sm text-foreground/70">Wishlist items</p>
          <Link href="/wishlist" className="mt-2 inline-block text-sm text-primary hover:underline">
            View wishlist
          </Link>
        </div>
        <div className="card-store text-center">
          <p className="text-3xl font-bold text-primary">
            {measurementsComplete ? "✓" : "—"}
          </p>
          <p className="mt-1 text-sm text-foreground/70">Measurements</p>
          <p className="mt-2 text-xs text-foreground/60">
            {measurementsComplete ? "Profile complete" : "Add bust, waist & shoulder"}
          </p>
          {!measurementsComplete ? (
            <Link
              href="/account/measurements"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Add measurements
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="card-store font-medium hover:border-primary">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
