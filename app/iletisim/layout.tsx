import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/iletisim", ...publicContentPages["/iletisim"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
