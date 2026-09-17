import { pageMetadata, publicContentPages } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/uyelik-sozlesmesi", ...publicContentPages["/uyelik-sozlesmesi"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
