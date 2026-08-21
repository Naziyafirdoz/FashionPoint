-- Retire unused Remind Me Later infrastructure.
-- order_reminders was only used by admin/worker snooze scheduling.
-- notifications.remind_after is retained for delivery follow-up reminders.

DROP TABLE IF EXISTS order_reminders;
