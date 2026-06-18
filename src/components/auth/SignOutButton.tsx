"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/app/(store)/account/actions";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className ?? "btn-outline text-sm"}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          router.push("/login");
          router.refresh();
        })
      }
    >
      {pending ? "Signing out…" : "Sign Out"}
    </button>
  );
}
