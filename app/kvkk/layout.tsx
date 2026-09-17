import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/kvkk", ...publicContentPages["/kvkk"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
