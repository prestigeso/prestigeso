import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import ConditionalLayout from "@/components/ConditionalUI";
import AppAlertProvider from "@/components/ui/AppAlertProvider";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeso.com.tr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PrestigeSO | Tarzını Yeniden Keşfet",
    template: "%s | PrestigeSO",
  },
  description:
    "PrestigeSO’da zanaat, kültürel simgeler ve modern tasarımın buluştuğu özel aksesuar ve dekoratif ürünleri keşfedin.",
  alternates: {
    canonical: "/",
  },
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
    description:
      "PrestigeSO’da özel aksesuar ve dekoratif ürünleri keşfedin.",
    images: ["/logo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AppAlertProvider>
          <SearchProvider>
            <CartProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </CartProvider>
          </SearchProvider>
        </AppAlertProvider>
      </body>
    </html>
  );
}
