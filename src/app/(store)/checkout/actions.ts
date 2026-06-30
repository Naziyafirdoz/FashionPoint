"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutAddressToSavePayload } from "@/lib/checkout/saved-addresses";
import { normalizePincode } from "@/lib/shipping/pincode-lookup";

const MAX_ADDRESSES = 5;

export async function saveCheckoutAddressAction(input: {
  name: string;
  phone: string;
  house_flat: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  const pincode = normalizePincode(input.pincode);
  const payload = checkoutAddressToSavePayload({
    name: input.name,
    phone: input.phone,
    secondary_phone: "",
    email: user.email ?? "",
    house_flat: input.house_flat,
    street: input.street,
    landmark: input.landmark,
    city: input.city,
    state: input.state,
    pincode
  });

  if (!payload.name || !payload.phone || !payload.line1 || !payload.city || !payload.state || !payload.pincode) {
    return { error: "Please complete all required address fields before saving." };
  }

  const { count } = await admin
    .from("addresses")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", user.id);

  if ((count ?? 0) >= MAX_ADDRESSES) {
    return { error: `You can save up to ${MAX_ADDRESSES} addresses.` };
  }

  const { count: defaultCount } = await admin
    .from("addresses")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .eq("is_default", true);

  const { error } = await admin.from("addresses").insert({
    customer_id: user.id,
    label: "Checkout",
    name: payload.name,
    phone: payload.phone,
    line1: payload.line1,
    line2: payload.line2,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    is_default: (defaultCount ?? 0) === 0
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}
