import { createClient } from "@/lib/supabase/server";
import { CheckoutForm, type CheckoutAddress } from "@/components/store/CheckoutForm";
import type { Address } from "@/types";

export const metadata = { title: "Checkout" };

function toCheckoutAddress(address: Address, email: string): CheckoutAddress {
  const line = [address.line1, address.line2].filter(Boolean).join(", ");
  return {
    name: address.name ?? "",
    phone: address.phone ?? "",
    secondary_phone: "",
    email,
    house_flat: "",
    street: line,
    landmark: "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? ""
  };
}

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

  let initialAddress: CheckoutAddress | undefined;

  if (user) {
    const { data: defaultAddress } = await supabase
      .from("addresses")
      .select("*")
      .eq("customer_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (defaultAddress) {
      initialAddress = toCheckoutAddress(defaultAddress as Address, user.email ?? "");
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

  return <CheckoutForm initialAddress={initialAddress} checkoutMode={checkoutMode} />;
}
