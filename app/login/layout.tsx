import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap | PrestigeSO",
  description: "PrestigeSO hesabınıza giriş yapın veya yeni kayıt oluşturun.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
