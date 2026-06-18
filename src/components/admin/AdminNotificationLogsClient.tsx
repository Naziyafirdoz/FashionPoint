"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { notificationTypeLabel, type NotificationLogRow } from "@/lib/notifications/types";

const CHANNELS = ["all", "email", "whatsapp", "push"] as const;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AdminNotificationLogsClient() {
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("all");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = channel === "all" ? "" : `?channel=${channel}`;
      const res = await fetch(`/api/admin/notification-logs${query}`);
      const data = (await res.json()) as { logs?: NotificationLogRow[] };
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const stats = useMemo(() => {
    const success = logs.filter((l) => l.success).length;
    const failed = logs.filter((l) => !l.success).length;
    return { success, failed, total: logs.length };
  }, [logs]);

  return (
    <div className="min-h-screen">
      <AdminHeader title="Notification Logs" />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-foreground/60">Total events</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-foreground/60">Successful</p>
            <p className="text-2xl font-semibold text-green-700">{stats.success}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-foreground/60">Failed</p>
            <p className="text-2xl font-semibold text-red-700">{stats.failed}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                channel === c ? "bg-primary text-white" : "border bg-white hover:bg-blush"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="ml-auto rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-blush"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-blush/40 text-left text-xs uppercase tracking-wide text-foreground/60">
                <tr>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-foreground/60">
                      Loading…
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-foreground/60">
                      No delivery logs yet
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 capitalize">{log.channel}</td>
                      <td className="px-4 py-3">{notificationTypeLabel(log.event)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.success ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.order_id ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(log.created_at)}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-red-700">
                        {log.error_message ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
