"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { AIGrowthDateFilterSelect } from "@/components/admin/ai-growth/ai-growth-shared";
import { useAIGrowthContext } from "@/components/admin/ai-growth/ai-growth-context";

type AIGrowthPageShellProps = {
  title: string;
  children: ReactNode;
};

export function AIGrowthPageShell({ title, children }: AIGrowthPageShellProps) {
  const { loading, error, dateFilter, setDateFilter, lastUpdated } = useAIGrowthContext();

  return (
    <>
      <AdminHeader
        title={title}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AdminLiveStatus lastUpdated={lastUpdated} live={false} />
            <AIGrowthDateFilterSelect value={dateFilter} onChange={setDateFilter} />
          </div>
        }
      />

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading order data…</p>
        ) : error ? (
          <EmptyState icon={Sparkles} title="Unable to load order data" description={error} />
        ) : (
          children
        )}
      </div>
    </>
  );
}
