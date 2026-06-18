import type { SupabaseClient } from "@supabase/supabase-js";
import { processAdminDueReminder } from "@/lib/server/notifications/admin-approval-reminders";
import type { Order } from "@/types";

export type ReminderAudience = "admin" | "worker";

export async function cancelOrderReminders(
  db: SupabaseClient,
  orderId: string,
  audience?: ReminderAudience,
  workerId?: string
): Promise<void> {
  const now = new Date().toISOString();
  let q = db
    .from("order_reminders")
    .update({ cancelled_at: now })
    .eq("order_id", orderId)
    .is("cancelled_at", null)
    .is("fulfilled_at", null);

  if (audience) q = q.eq("audience", audience);
  if (workerId) q = q.eq("worker_id", workerId);

  await q;
}

export async function scheduleOrderReminder(
  db: SupabaseClient,
  input: {
    orderId: string;
    audience: ReminderAudience;
    intervalHours?: number;
    delayMinutes?: number;
    workerId?: string;
  }
): Promise<{ ok: true; remindAt: string } | { ok: false; error: string }> {
  const delayMs =
    input.delayMinutes != null
      ? input.delayMinutes * 60 * 1000
      : (input.intervalHours ?? 2) * 60 * 60 * 1000;
  const remindAt = new Date(Date.now() + delayMs).toISOString();
  const intervalHoursForDb =
    input.delayMinutes != null
      ? Math.max(1, Math.ceil(input.delayMinutes / 60))
      : (input.intervalHours ?? 2);

  await cancelOrderReminders(
    db,
    input.orderId,
    input.audience,
    input.workerId
  );

  const { error } = await db.from("order_reminders").insert({
    order_id: input.orderId,
    audience: input.audience,
    worker_id: input.workerId ?? null,
    remind_at: remindAt,
    interval_hours: intervalHoursForDb
  });

  if (error) {
    return { ok: false, error: "Unable to schedule reminder" };
  }

  return { ok: true, remindAt };
}

export async function processDueOrderReminders(db: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();
  const { data: due, error } = await db
    .from("order_reminders")
    .select("id, order_id, audience, worker_id")
    .lte("remind_at", now)
    .is("cancelled_at", null)
    .is("fulfilled_at", null)
    .limit(50);

  if (error || !due?.length) {
    if (error) {
      console.error("[order-reminders] fetch due failed", { message: error.message });
    }
    return 0;
  }

  console.info("[order-reminders] processing due reminders", { count: due.length });

  let processed = 0;
  for (const reminder of due) {
    const { data: order } = await db
      .from("orders")
      .select("*")
      .eq("id", reminder.order_id)
      .maybeSingle();

    if (!order) {
      await db
        .from("order_reminders")
        .update({ fulfilled_at: now, cancelled_at: now })
        .eq("id", reminder.id);
      continue;
    }

    if (reminder.audience === "admin") {
      const result = await processAdminDueReminder(db, order as Order);
      console.info("[order-reminders] admin reminder", {
        orderId: reminder.order_id,
        result
      });
    }

    await db.from("order_reminders").update({ fulfilled_at: now }).eq("id", reminder.id);
    processed++;
  }

  console.info("[order-reminders] completed", { processed });
  return processed;
}
