import { pageMetadata } from "@/lib/seo/pageMetadata";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import styles from "@/components/admin/AdminDesign.module.css";

export const metadata = pageMetadata(
  "/admin/analysis",
  "Mağaza Analizi",
  "PrestigeSO yetkili mağaza analiz alanı.",
  true,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><AdminSectionNav current="analysis" /><div className={styles.report}>{children}</div></>;
}
