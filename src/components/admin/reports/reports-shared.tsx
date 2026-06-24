"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const REPORTS_EMPTY_MESSAGE = "No records found for selected period.";

export function ReportsPageShell({
  title,
  action,
  children
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AdminHeader title={title} action={action} />
      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">{children}</div>
    </>
  );
}

export function ReportsSection({
  title,
  children,
  footer
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export function ReportsTable({
  columns,
  rows,
  emptyMessage = REPORTS_EMPTY_MESSAGE
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-accent/15 text-xs uppercase tracking-wide text-foreground/50">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-foreground/60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((cells, index) => (
              <tr key={index} className="border-b border-accent/10 last:border-0">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-foreground/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</div>
  );
}
