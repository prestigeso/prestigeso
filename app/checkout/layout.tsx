import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme | PrestigeSO",
  description: "Güvenli ödeme sayfamızdan siparişinizi tamamlayın.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
