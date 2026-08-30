import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { addressToCheckoutAddress } from "@/lib/checkout/saved-addresses";
import { getStoreInformation } from "@/lib/settings/store-information";
import type { Address } from "@/types";

export const metadata = { title: "Checkout" };

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { mode } = await searchParams;
  const checkoutMode = mode === "buy_now" ? "buy_now" : "cart";
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let initialAddress;
  let savedAddresses: Address[] = [];

  if (user) {
    const { data: addresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    savedAddresses = (addresses ?? []) as Address[];

    const defaultAddress = savedAddresses.find((address) => address.is_default) ?? savedAddresses[0];

    if (defaultAddress) {
      initialAddress = addressToCheckoutAddress(defaultAddress, user.email ?? "");
    } else {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (customer?.full_name || customer?.phone || user.email) {
        initialAddress = {
          name: customer?.full_name ?? "",
          phone: customer?.phone ?? "",
          secondary_phone: "",
          email: user.email ?? "",
          house_flat: "",
          street: "",
          landmark: "",
          city: "",
          state: "",
          pincode: ""
        };
      }
    }
  }

  const { storeName } = await getStoreInformation();

  return (
    <CheckoutForm
      initialAddress={initialAddress}
      savedAddresses={savedAddresses}
      checkoutMode={checkoutMode}
      storeName={storeName}
    />
  );
}
