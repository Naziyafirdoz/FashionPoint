import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmail } from "@/lib/checkout/contact-validation";
import { notifyAdminOfBackInStockRequest } from "@/lib/stock-notifications/admin-notify";
import { saveStockNotificationRequest } from "@/lib/stock-notifications/save-request";
import { verifyProductForStockNotification } from "@/lib/stock-notifications/verify-product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  product_id: z.string().uuid("Invalid product."),
  product_name: z.string().trim().optional(),
  customer_name: z.string().trim().min(2, "Please enter your full name (at least 2 characters)."),
  customer_email: z.string().trim().min(1, "Please enter a valid email address.")
}).superRefine((data, ctx) => {
  if (!isValidEmail(data.customer_email)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid email address.",
      path: ["customer_email"]
    });
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request.";
      const isEmailIssue = parsed.error.issues.some((issue) => issue.path[0] === "customer_email");
      return NextResponse.json(
        { error: isEmailIssue ? "Please enter a valid email address." : message },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    if (!db) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 503 }
      );
    }

    const productResult = await verifyProductForStockNotification(db, parsed.data.product_id);
    if (!productResult.ok) {
      const status = productResult.message.includes("no longer") ? 404 : 400;
      return NextResponse.json({ error: productResult.message }, { status });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const result = await saveStockNotificationRequest(db, {
      productId: productResult.product.id,
      productName: productResult.product.name,
      customerName: parsed.data.customer_name,
      customerEmail: parsed.data.customer_email,
      userId: user?.id ?? null
    });

    if (!result.ok) {
      const status = result.code === "duplicate" ? 409 : result.code === "validation" ? 400 : 500;
      return NextResponse.json({ error: result.message }, { status });
    }

    const requestedAt = new Date().toISOString();
    void notifyAdminOfBackInStockRequest(db, {
      requestId: result.id,
      productId: productResult.product.id,
      productName: productResult.product.name,
      customerName: parsed.data.customer_name.trim(),
      customerEmail: parsed.data.customer_email.trim().toLowerCase(),
      requestedAt
    }).catch((err) => {
      console.error("[back-in-stock] admin notify failed", {
        requestId: result.id,
        message: err instanceof Error ? err.message : String(err)
      });
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[back-in-stock] stock-notify route error", {
      message: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
