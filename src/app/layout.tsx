import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { Analytics } from "@/components/analytics/Analytics";
import { SITE_URL } from "@/lib/site-config";
import { getStoreInformation } from "@/lib/settings/store-information";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreInformation();

  return {
    title: {
      default: `${storeName} | Premium Ready-Made Indian Blouses`,
      template: `%s | ${storeName}`
    },
    description:
      "Shop premium readymade blouses — daily wear, designer & party collections. AI size finder, saree color matcher & style assistant.",
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: storeName,
      description: "Premium readymade Indian blouses with AI-powered shopping",
      type: "website",
      siteName: storeName
    },
    twitter: { card: "summary_large_image", title: storeName },
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
