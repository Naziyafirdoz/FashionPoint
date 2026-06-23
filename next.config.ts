import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TEMP DEBUG: disable double-mount fetches while investigating Supabase connection flooding.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" }
    ]
  }
};

export default nextConfig;
