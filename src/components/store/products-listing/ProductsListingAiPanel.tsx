import Link from "next/link";
import { Ruler, Sparkles } from "lucide-react";

export function ProductsListingAiPanel() {
  return (
    <aside className="flex h-full w-full min-w-0 max-w-full flex-col">
      <div className="w-full rounded-[20px] border border-[#F2E4E8] bg-white p-5 shadow-[0_4px_20px_rgba(122,13,43,0.05)] lg:sticky lg:top-[clamp(4.5rem,8vh,6rem)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-primary">AI Features</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#666666]">Need help choosing a size?</p>
        <Link
          href="/ai-features/size-finder"
          className="btn-primary mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-sm font-bold uppercase tracking-[0.04em]"
        >
          <Ruler className="h-4 w-4" aria-hidden="true" />
          Find Your Size
        </Link>
      </div>
    </aside>
  );
}
