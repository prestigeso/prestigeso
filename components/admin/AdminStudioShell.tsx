"use client";
import { useState, type ReactNode } from "react";
import s from "./AdminStudio.module.css";
export const adminSections = [
  ["overview", "Genel bakış", "◫"],
  ["products", "Ürünler", "◇"],
  ["orders", "Siparişler", "▤"],
  ["customers", "Müşteriler", "♧"],
  ["performance", "Mağaza performansı", "▥"],
  ["marketing", "Pazarlama", "↗"],
  ["finance", "Finans", "₺"],
  ["settings", "Ayarlar", "⚙"],
] as const;
export type AdminSection = (typeof adminSections)[number][0];
const iconPaths: Record<AdminSection, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  products: "m3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10 M7.5 5l9 4",
  orders: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
  customers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87",
  performance: "M3 3v18h18 M7 16v-5 M12 16V7 M17 16V4",
  marketing: "m3 11 18-7v16L3 13z M7 14l2 7h4l-3-6",
  finance: "M3 6h18v14H3z M3 6V4h15v2 M15 11h6v5h-6z",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
};
export function isAdminSection(value: string | null): value is AdminSection {
  return adminSections.some(([key]) => key === value);
}
export default function AdminStudioShell({
  section,
  onNavigate,
  children,
}: {
  section: AdminSection;
  onNavigate: (s: AdminSection) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={`${s.row} ${s.spread}`}>
          <a className={s.brand} href="/admin">
            PrestigeSO<small>YÖNETİM PANELİ</small>
          </a>
          <button
            type="button"
            className={`${s.button} ${s.mobileMenu}`}
            aria-expanded={open}
            aria-controls="admin-studio-nav"
            onClick={() => setOpen(!open)}
          >
            Menü
          </button>
        </div>
        <nav
          id="admin-studio-nav"
          aria-label="Yönetim menüsü"
          className={`${s.nav} ${open ? s.navOpen : ""}`}
        >
          {adminSections.map(([key, name]) => (
            <a
              key={key}
              href={`/admin?view=${key}`}
              aria-current={section === key ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onNavigate(key);
                setOpen(false);
              }}
            >
              <span aria-hidden="true" className={s.navIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[key]} /></svg>
              </span>
              {name}
            </a>
          ))}
        </nav>
      </aside>
      <div className={s.main}>
        <div className={s.topbar}>
          <span>
            PrestigeSO / {adminSections.find(([key]) => key === section)?.[1]}
          </span>
          <a href="/" target="_blank" rel="noopener noreferrer">
            Mağazayı görüntüle ↗
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
