"use client";

import { useEffect, useState } from "react";
import { registerAdminFcmToken } from "@/lib/notifications/firebase-client";

export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("fp_push_permission_asked");
    const hasFirebase = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    setDismissed(Boolean(done) || !hasFirebase);
  }, []);

  if (dismissed) return null;

  const enable = async () => {
    setLoading(true);
    try {
      const token = await registerAdminFcmToken();
      if (token) {
        await fetch("/api/admin/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcm_token: token })
        });
      }
      localStorage.setItem("fp_push_permission_asked", "1");
      setDismissed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>Allow notifications to receive new order alerts instantly?</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-amber-300 px-3 py-1 text-xs"
            onClick={() => {
              localStorage.setItem("fp_push_permission_asked", "1");
              setDismissed(true);
            }}
          >
            Not now
          </button>
          <button
            type="button"
            disabled={loading}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            onClick={() => void enable()}
          >
            {loading ? "Enabling…" : "Allow notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
