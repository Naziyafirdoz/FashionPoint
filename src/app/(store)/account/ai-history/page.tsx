import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AiHistoryList } from "@/components/account/AiHistoryList";
import type { AiInteraction } from "@/types";

export const metadata = { title: "AI History" };

export default async function AccountAiHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/ai-history");

  const { data: interactions } = await supabase
    .from("ai_interactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/account/dashboard" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">AI History</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Your past Size Finder, Color Matcher, and Style Assistant sessions.
      </p>
      <AiHistoryList interactions={(interactions ?? []) as AiInteraction[]} />
    </div>
  );
}
