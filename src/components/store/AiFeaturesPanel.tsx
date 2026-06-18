import Link from "next/link";

export function AiFeaturesPanel() {
  return (
    <aside className="hidden space-y-4 lg:block">
      <div className="card-store">
        <h3 className="font-bold text-primary">AI FEATURES</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/ai-features/size-finder" className="hover:text-primary">AI Size Finder</Link></li>
          <li><Link href="/ai-features/color-matcher" className="hover:text-primary">Saree Color Matcher</Link></li>
          <li><Link href="/ai-features/style-recommender" className="hover:text-primary">AI Style Assistant</Link></li>
          <li><span className="text-foreground/50">Virtual Try-On (Soon)</span></li>
        </ul>
        <Link href="/ai-features" className="btn-primary mt-4 block w-full text-center text-xs">
          TRY AI MAGIC
        </Link>
      </div>
      <div className="card-store bg-primary text-white">
        <p className="font-display font-bold">FIND YOUR PERFECT BLOUSE</p>
        <Link href="/ai-features/size-finder" className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-xs font-bold text-foreground">
          START NOW
        </Link>
      </div>
    </aside>
  );
}
