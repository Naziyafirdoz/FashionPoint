import { handleOrderNotificationRequest } from "@/lib/server/notifications/route-handler";

export async function POST(req: Request) {
  return handleOrderNotificationRequest(req, "new_order");
}
