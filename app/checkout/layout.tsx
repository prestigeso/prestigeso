import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Güvenli ödeme sayfamızdan siparişinizi tamamlayın.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
  referrer: "no-referrer",
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
