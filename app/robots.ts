import type { MetadataRoute } from "next";

import { getSeoSiteOrigin } from "@/lib/seo/siteOrigin";

const SITE_URL = getSeoSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api",
        "/api/",
        "/checkout",
        "/profile",
        "/login",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
