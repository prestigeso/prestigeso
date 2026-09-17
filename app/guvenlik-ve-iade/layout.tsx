import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/guvenlik-ve-iade", ...publicContentPages["/guvenlik-ve-iade"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
