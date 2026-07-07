import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesabım | PrestigeSO",
  description: "Siparişlerinizi takip edin, adreslerinizi ve hesap bilgilerinizi yönetin.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
