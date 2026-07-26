import { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Güvenli ödeme sayfamızdan siparişinizi tamamlayın.",
  robots: { index: false, follow: false },
};

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;

  return (
    <>
      <Script
        src="https://www.paytr.com/js/iframeResizer.min.js?v2"
        strategy="afterInteractive"
        nonce={nonce}
      />
      {children}
    </>
  );
}
