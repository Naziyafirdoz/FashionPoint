"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type WorkerAssignCardProps = {
  orderId: string;
  disabled?: boolean;
  onAssigned?: () => void;
};

type WorkerRow = { user_id: string; role: string };

export function WorkerAssignCard({ orderId, disabled, onAssigned }: WorkerAssignCardProps) {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/workers")
      .then((r) => r.json())
      .then((d) => setWorkers((d.workers as WorkerRow[]) ?? []))
      .catch(() => setWorkers([]));
  }, []);

  const assign = async () => {
    if (!workerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign-worker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to assign worker");
        return;
      }
      toast.success(data.message ?? "Worker assigned");
      onAssigned?.();
    } finally {
      setLoading(false);
    }
  };

  if (!workers.length) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Assign Packing</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={workerId}
          disabled={disabled || loading}
          onChange={(e) => setWorkerId(e.target.value)}
        >
          <option value="">Select worker</option>
          {workers.map((w) => (
            <option key={w.user_id} value={w.user_id}>
              Worker {w.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={disabled || loading || !workerId}
          onClick={() => void assign()}
        >
          {loading ? "Assigning…" : "Assign Worker"}
        </button>
        <a href="/admin/worker" className="text-sm text-primary hover:underline">
          Open worker dashboard
        </a>
      </div>
    </section>
  );
}
