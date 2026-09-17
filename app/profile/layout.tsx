import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesabım",
  description:
    "Siparişlerinizi takip edin, adreslerinizi ve hesap bilgilerinizi yönetin.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
  referrer: "no-referrer",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
