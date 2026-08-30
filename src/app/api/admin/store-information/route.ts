import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  parseStoreInformationInput,
  STORE_INFORMATION_CACHE_TAG
} from "@/lib/settings/store-information";
import {
  loadStoreInformationFromDb,
  saveStoreInformationToDb
} from "@/lib/settings/store-information-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const settings = await loadStoreInformationFromDb();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = parseStoreInformationInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await saveStoreInformationToDb(parsed.input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save store information" }, { status: 500 });
  }

  revalidateTag(STORE_INFORMATION_CACHE_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");

  return NextResponse.json({ settings: result.settings });
}
