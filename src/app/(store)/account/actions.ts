"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerRecord } from "@/lib/auth/helpers";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bust = formData.get("bust_measurement");
  const waist = formData.get("waist_measurement");
  const shoulder = formData.get("shoulder_measurement");
  const preferredSize = String(formData.get("preferred_size") ?? "").trim();

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? "",
    fullName: fullName || undefined,
    phone: phone || undefined
  });

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  const { error } = await admin
    .from("customers")
    .update({
      full_name: fullName || null,
      phone: phone || null,
      bust_measurement: bust ? Number(bust) : null,
      waist_measurement: waist ? Number(waist) : null,
      shoulder_measurement: shoulder ? Number(shoulder) : null,
      preferred_size: preferredSize || null
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/dashboard");
  revalidatePath("/account/profile");
  return { success: true };
}

function parseBodyMeasurement(raw: FormDataEntryValue | null, unit: string) {
  if (!raw || String(raw).trim() === "") return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return unit === "cm" ? num * CM_TO_INCH : num;
}

function parseHeight(raw: FormDataEntryValue | null, unit: string) {
  if (!raw || String(raw).trim() === "") return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return unit === "inch" ? num * INCH_TO_CM : num;
}

function parseWeight(raw: FormDataEntryValue | null, unit: string) {
  if (!raw || String(raw).trim() === "") return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return unit === "lb" ? num / KG_TO_LBS : num;
}

const CM_TO_INCH = 1 / 2.54;
const INCH_TO_CM = 2.54;
const KG_TO_LBS = 2.20462;

export async function updateMeasurementsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const lengthUnit = String(formData.get("length_unit") ?? "inch");
  const heightUnit = String(formData.get("height_unit") ?? "cm");
  const weightUnit = String(formData.get("weight_unit") ?? "kg");

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  const { error } = await admin
    .from("customers")
    .update({
      bust_measurement: parseBodyMeasurement(formData.get("bust_measurement"), lengthUnit),
      underbust_measurement: parseBodyMeasurement(formData.get("underbust_measurement"), lengthUnit),
      waist_measurement: parseBodyMeasurement(formData.get("waist_measurement"), lengthUnit),
      shoulder_measurement: parseBodyMeasurement(formData.get("shoulder_measurement"), lengthUnit),
      height_cm: parseHeight(formData.get("height"), heightUnit),
      weight_kg: parseWeight(formData.get("weight"), weightUnit)
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/dashboard");
  revalidatePath("/account/measurements");
  revalidatePath("/ai-features/size-finder");
  return { success: true };
}

export async function saveSizeRecommendationAction(params: {
  recommendedSize: string;
  fitPreference: string;
  measurements?: {
    bust?: number;
    underbust?: number;
    waist?: number;
    shoulder?: number;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const recommendedSize = params.recommendedSize?.trim();
  const fitPreference = params.fitPreference?.trim();

  if (!recommendedSize) {
    return { error: "Recommended size is required" };
  }

  if (!["fitted", "regular", "loose"].includes(fitPreference)) {
    return { error: "Invalid fit preference" };
  }

  await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  const now = new Date().toISOString();
  const measurementFields = params.measurements
    ? {
        bust_measurement: params.measurements.bust ?? null,
        underbust_measurement: params.measurements.underbust ?? null,
        waist_measurement: params.measurements.waist ?? null,
        shoulder_measurement: params.measurements.shoulder ?? null
      }
    : {};

  const fullPayload = {
    recommended_size: recommendedSize,
    preferred_size: recommendedSize,
    fit_preference: fitPreference,
    sizing_updated_at: now,
    ...measurementFields
  };

  let { error } = await admin.from("customers").update(fullPayload).eq("id", user.id);

  if (error) {
    const { error: fallbackError } = await admin
      .from("customers")
      .update({
        preferred_size: recommendedSize,
        ...measurementFields
      })
      .eq("id", user.id);

    if (fallbackError) {
      return { error: fallbackError.message };
    }
  }

  revalidatePath("/account/profile");
  revalidatePath("/account/measurements");
  revalidatePath("/ai-features/size-finder");
  return { success: true, sizing_updated_at: now };
}

const MAX_ADDRESSES = 5;

export async function saveAddressAction(formData: FormData) {
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

  const addressId = String(formData.get("id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const isDefault = formData.get("is_default") === "on";

  if (!name || !phone || !line1 || !city || !state || !pincode) {
    return { error: "Please fill in all required fields." };
  }

  if (isDefault) {
    await admin.from("addresses").update({ is_default: false }).eq("customer_id", user.id);
  }

  const payload = {
    customer_id: user.id,
    label: label || "Home",
    name,
    phone,
    line1,
    line2: line2 || null,
    city,
    state,
    pincode,
    is_default: isDefault
  };

  if (addressId) {
    const { error } = await admin.from("addresses").update(payload).eq("id", addressId).eq("customer_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { count } = await admin
      .from("addresses")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", user.id);

    if ((count ?? 0) >= MAX_ADDRESSES) {
      return { error: `You can save up to ${MAX_ADDRESSES} addresses.` };
    }

    const { error } = await admin.from("addresses").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function deleteAddressAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const addressId = String(formData.get("id") ?? "").trim();
  if (!addressId) {
    return { error: "Address not found" };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  const { error } = await admin
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function setDefaultAddressAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const addressId = String(formData.get("id") ?? "").trim();
  if (!addressId) {
    return { error: "Address not found" };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Database not configured" };
  }

  await admin.from("addresses").update({ is_default: false }).eq("customer_id", user.id);

  const { error } = await admin
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}
