import Link from "next/link";

export const metadata = { title: "Coming Soon" };

export default function SoonPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-bold text-primary">Something Exclusive Is Coming Soon</h1>
      <p className="mt-4 text-foreground/70">
        We are crafting a new collection just for you. Stay tuned!
      </p>
      <Link href="/" className="btn-primary mt-8 inline-flex">
        Back to Home
      </Link>
    </section>
  );
}
