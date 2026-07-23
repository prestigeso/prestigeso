import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "PrestigeSO hesabınıza giriş yapın veya yeni kayıt oluşturun.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
