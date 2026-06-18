import Link from "next/link";
import { SAMPLE_BLOGS } from "@/lib/mock-data";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-primary">Blog</h1>
      <div className="mt-8 space-y-6">
        {SAMPLE_BLOGS.map((b) => (
          <article key={b.id} className="card-store">
            <p className="text-xs text-secondary">{b.category}</p>
            <h2 className="mt-1 font-display text-xl font-bold text-primary">
              <Link href={`/blog/${b.slug}`}>{b.title}</Link>
            </h2>
            <p className="mt-2 text-sm text-foreground/70">{b.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
