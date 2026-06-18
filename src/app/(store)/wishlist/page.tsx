import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/wishlist");

  const { data: items } = await supabase
    .from("wishlist")
    .select("id, product_id, created_at, products(id, name, slug, price, images)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-primary">Wishlist</h1>
      {!items?.length ? (
        <p className="mt-4 text-foreground/70">Your saved blouses will appear here.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const raw = item.products;
            const product = (Array.isArray(raw) ? raw[0] : raw) as {
              id: string;
              name: string;
              slug: string;
              price: number;
              images?: string[];
            } | null;
            if (!product) return null;
            return (
              <Link
                key={item.id}
                href={`/product/${product.slug}`}
                className="card-store hover:border-primary"
              >
                <p className="font-semibold text-primary">{product.name}</p>
                <p className="mt-1 text-sm">₹{Number(product.price).toLocaleString("en-IN")}</p>
              </Link>
            );
          })}
        </div>
      )}
      <Link href="/account/dashboard" className="mt-6 inline-block text-sm text-primary hover:underline">
        ← Back to account
      </Link>
    </div>
  );
}
