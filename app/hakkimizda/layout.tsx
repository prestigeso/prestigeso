import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/hakkimizda", ...publicContentPages["/hakkimizda"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
