import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/gizlilik-ilkeleri", ...publicContentPages["/gizlilik-ilkeleri"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
