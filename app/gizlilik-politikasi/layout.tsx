import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/gizlilik-politikasi", ...publicContentPages["/gizlilik-politikasi"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
