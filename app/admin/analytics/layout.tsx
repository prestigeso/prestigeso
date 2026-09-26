import type { Metadata } from "next";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import styles from "@/components/admin/AdminDesign.module.css";
export const metadata: Metadata = { title: "Mağaza Yolculuğu Analizi", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <><AdminSectionNav current="analytics" /><div className={styles.report}>{children}</div></>; }
