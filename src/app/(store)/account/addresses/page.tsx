import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import { AddressesView } from "@/components/account/AddressesView";
import type { Address } from "@/types";

export const metadata = { title: "Saved Addresses" };

const MAX_ADDRESSES = 5;

export default async function AccountAddressesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/addresses");

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const canAddMore = (addresses?.length ?? 0) < MAX_ADDRESSES;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/account/dashboard" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">Saved Addresses</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Manage delivery addresses for faster checkout. You can save up to {MAX_ADDRESSES} addresses.
      </p>
      <AddressesView addresses={(addresses ?? []) as Address[]} canAddMore={canAddMore} />
    </div>
  );
}
