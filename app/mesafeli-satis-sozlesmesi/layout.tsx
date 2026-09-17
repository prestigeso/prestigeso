import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/mesafeli-satis-sozlesmesi", ...publicContentPages["/mesafeli-satis-sozlesmesi"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
