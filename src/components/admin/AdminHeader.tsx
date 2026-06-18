"use client";

import { Search } from "lucide-react";
import { NotificationCenter } from "@/components/admin/NotificationCenter";

export function AdminHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <h1 className="font-display text-xl font-bold text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-foreground/50" />
          <input placeholder="Search..." className="w-40 bg-transparent text-sm outline-none" />
        </div>
        <NotificationCenter />
        <div className="h-8 w-8 rounded-full bg-primary text-center text-xs leading-8 text-white">A</div>
      </div>
    </header>
  );
}
