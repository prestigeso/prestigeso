import Link from "next/link";
import styles from "./AdminDesign.module.css";

export default function AdminSectionNav({ current }: { current: "analytics" | "analysis" | "phase2" }) {
  return <div className={styles.sectionNav}>
    <Link href="/admin" className={styles.wordmark}>PRESTIGESO<small>YÖNETİM PANELİ</small></Link>
    <nav aria-label="Yönetim raporları">
      <Link href="/admin/analysis" aria-current={current === "analysis" ? "page" : undefined}>Satış analizi</Link>
      <Link href="/admin/analytics" aria-current={current === "analytics" ? "page" : undefined}>Müşteri yolculuğu</Link>
      <Link href="/admin/phase2" aria-current={current === "phase2" ? "page" : undefined}>Finans & bağlantılar</Link>
    </nav>
    <Link href="/admin" className={styles.backLink}>Ana panel ↗︎</Link>
  </div>;
}
