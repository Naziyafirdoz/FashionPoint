import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { Analytics } from "@/components/analytics/Analytics";
import { SITE_URL, STORE_SEO_DESCRIPTION, STORE_SEO_OG_DESCRIPTION } from "@/lib/site-config";
import { getStoreInformation, resolveSeoTitle } from "@/lib/settings/store-information";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreInformation();
  const defaultTitle = resolveSeoTitle(store);
  const ogDescription =
    store.seoDescription === STORE_SEO_DESCRIPTION
      ? STORE_SEO_OG_DESCRIPTION
      : store.seoDescription;

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${store.storeName}`
    },
    description: store.seoDescription,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: store.storeName,
      description: ogDescription,
      type: "website",
      siteName: store.storeName
    },
    twitter: { card: "summary_large_image", title: store.storeName },
    robots: { index: true, follow: true }
  };
}

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
            Skip to content
          </a>
          <main id="main">{children}</main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
