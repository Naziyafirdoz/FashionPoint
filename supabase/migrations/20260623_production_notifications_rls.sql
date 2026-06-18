-- RLS for in-app notifications (admin realtime + API)

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_admin_select ON notifications;
CREATE POLICY notifications_admin_select ON notifications
  FOR SELECT TO authenticated
  USING (
    recipient = 'admin'
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS notifications_admin_update ON notifications;
CREATE POLICY notifications_admin_update ON notifications
  FOR UPDATE TO authenticated
  USING (
    recipient = 'admin'
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    recipient = 'admin'
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_logs_admin_select ON notification_logs;
CREATE POLICY notification_logs_admin_select ON notification_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
