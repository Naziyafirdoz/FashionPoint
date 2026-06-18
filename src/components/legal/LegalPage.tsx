export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose prose-sm">
      <h1 className="font-display text-3xl font-bold text-primary">{title}</h1>
      <div className="mt-6 space-y-4 text-foreground/80">{children}</div>
    </article>
  );
}
