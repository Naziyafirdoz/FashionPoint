import { NextResponse } from "next/server";
import { z } from "zod";
import { saveProductAlert } from "@/lib/product-alerts";

const isDev = process.env.NODE_ENV === "development";
const ROUTE = "src/app/api/product-alerts/route.ts";

const bodySchema = z
  .object({
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    color: z.string().trim().min(1, "Color is required.").max(120),
    notificationTypes: z
      .array(z.enum(["email", "whatsapp"]))
      .min(1, "Select at least one notification type.")
  })
  .superRefine((data, ctx) => {
    const hasEmail = data.email.length > 0;
    const hasPhone = data.phone.length > 0;

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone is required.",
        path: ["email"]
      });
      return;
    }

    if (hasEmail && !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid email address.",
        path: ["email"]
      });
    }

    if (hasPhone && data.phone.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone must be at least 8 characters.",
        path: ["phone"]
      });
    }
  });

function errorResponse(
  message: string,
  status: number,
  line: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: message,
      ...(isDev ? { source: `${ROUTE}:${line}`, details } : {})
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        firstIssue?.message ?? "Invalid alert details.",
        400,
        68,
        isDev ? parsed.error.flatten() : undefined
      );
    }

    const result = await saveProductAlert({
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      color: parsed.data.color,
      notificationTypes: parsed.data.notificationTypes
    });

    if (!result.ok) {
      const { message, code, hint, details } = result.error;
      const isSchemaCache =
        message.includes("schema cache") || message.includes("product_alerts");

      return errorResponse(
        isSchemaCache
          ? "Alert table is not ready yet. Reload Supabase schema cache and try again."
          : "Could not save alert.",
        500,
        88,
        isDev
          ? { message, code, hint, details }
          : undefined
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Supabase error:", err);
    return errorResponse(
      "Could not save alert.",
      500,
      102,
      isDev
        ? { message: err instanceof Error ? err.message : String(err) }
        : undefined
    );
  }
}
