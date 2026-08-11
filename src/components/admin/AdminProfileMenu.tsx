"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/(store)/account/actions";
import { createClient } from "@/lib/supabase/client";

function avatarInitial(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "A";
  return source.charAt(0).toUpperCase();
}

export function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? null);
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const displayName =
        (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta?.name === "string" && meta.name.trim()) ||
        null;
      setName(displayName);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = avatarInitial(name, email);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
      setOpen(false);
      router.push("/admin/login");
      router.refresh();
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-semibold leading-none text-white transition hover:bg-primary/90"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            {name ? <p className="truncate text-sm font-semibold text-gray-900">{name}</p> : null}
            {email ? <p className="truncate text-xs text-gray-500">{email}</p> : null}
            {!name && !email ? <p className="text-sm text-gray-500">Admin account</p> : null}
          </div>
          <Link
            href="/admin/settings"
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blush"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-blush disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
