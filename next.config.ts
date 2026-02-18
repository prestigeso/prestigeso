import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Tüm https sitelerine izin ver (Scraping için en rahatı)
      },
    ],
  },
};

export default nextConfig;