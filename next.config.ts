// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Resimlere izin ver */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  /* TypeScript hatalarını görmezden gel */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;