import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import ConditionalLayout from "@/components/ConditionalUI";
import AppAlertProvider from "@/components/ui/AppAlertProvider";
import CookieConsent from "@/components/CookieConsent";
import { Suspense } from "react";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MarketingPreparation from "@/components/MarketingPreparation";

import { getSeoSiteOrigin } from "@/lib/seo/siteOrigin";

const SITE_URL = getSeoSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "PrestigeSO",
  manifest: "/manifest.json",
  title: {
    default: "PrestigeSO | Tarzını Yeniden Keşfet",
    template: "%s | PrestigeSO",
  },
  description:
    "PrestigeSO’da zanaat, kültürel simgeler ve modern tasarımın buluştuğu özel aksesuar ve dekoratif ürünleri keşfedin.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "PrestigeSO",
    title: "PrestigeSO | Tarzını Yeniden Keşfet",
    description:
      "Zanaat, kültürel simgeler ve modern tasarımla hazırlanmış özel aksesuar ve dekoratif ürünler.",
    images: [
      {
        url: "/logo.jpeg",
        width: 800,
        height: 800,
        alt: "PrestigeSO",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrestigeSO | Tarzını Yeniden Keşfet",
    description: "PrestigeSO’da özel aksesuar ve dekoratif ürünleri keşfedin.",
    images: ["/logo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce tabanlı CSP için her HTML yanıtı istek zamanında render edilir.
  await headers();
  return (
    <html lang="tr">
      <head>
        <link rel="dns-prefetch" href="//www.paytr.com" />
        <link rel="preconnect" href="https://www.paytr.com" />
      </head>
      <body className="font-sans">
        <AppAlertProvider>
          <SearchProvider>
            <CartProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </CartProvider>
          </SearchProvider>
        </AppAlertProvider>
        <CookieConsent />
        <MarketingPreparation enabled={process.env.MARKETING_PREPARATION_ENABLED === '1'} />
        <Suspense fallback={null}><AnalyticsTracker /></Suspense>
      </body>
    </html>
  );
}
