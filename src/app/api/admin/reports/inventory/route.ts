import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  buildInventoryReportBundle,
  formatReportServerError,
  parseReportRequest
} from "@/lib/admin/reports-server";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      const authJson = (await auth.response.json()) as { error?: string };
      return NextResponse.json(
        {
          success: false,
          error: authJson.error ?? "Unauthorized"
        },
        { status: auth.response.status }
      );
    }

    const request = parseReportRequest(new URL(req.url).searchParams);
    const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
    const result = await buildInventoryReportBundle(auth.ctx.db, request, { forceRefresh });

    if (result.status !== 200) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Invalid request"
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error("[GET /api/admin/reports/inventory]", error);

    return NextResponse.json(
      {
        success: false,
        error: formatReportServerError(error)
      },
      { status: 500 }
    );
  }
}
