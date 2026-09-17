import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/teslimat-bilgileri", ...publicContentPages["/teslimat-bilgileri"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
