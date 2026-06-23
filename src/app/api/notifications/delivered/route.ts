import { handleDeliveredNotificationRequest } from "@/lib/server/notifications/delivered-route-handler";

export async function POST(req: Request) {
  return handleDeliveredNotificationRequest(req);
}
