import { notFound } from "next/navigation";
import { SAMPLE_BLOGS } from "@/lib/mock-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = SAMPLE_BLOGS.find((b) => b.slug === slug);
  return { title: post?.title ?? "Blog" };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = SAMPLE_BLOGS.find((b) => b.slug === slug);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-primary">{post.title}</h1>
      <p className="mt-4 text-foreground/80">{post.excerpt}</p>
    </article>
  );
}
