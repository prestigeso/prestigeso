export function getShopMetadata(
  params: Record<string, string | string[] | undefined>,
) {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };
  const category = first("category").trim().slice(0, 100);
  const requested = Number(first("page"));
  const page =
    Number.isSafeInteger(requested) && requested > 1
      ? Math.min(requested, 10000)
      : 1;
  const canonical = new URLSearchParams();
  if (category) canonical.set("category", category);
  if (page > 1) canonical.set("page", String(page));
  const title = `${category || "Tüm Ürünler"}${page > 1 ? ` - Sayfa ${page}` : ""}`;
  // Search/sort/facets are useful navigation but not separate search landing pages.
  const filtered = [
    "q",
    "sort",
    "minPrice",
    "maxPrice",
    "discounted",
    "bestseller",
    "minRating",
    "availability",
    "option",
  ].some((key) => Boolean(first(key)));
  return {
    title,
    description: `${category || "Özel tasarım takı ve aksesuar"} koleksiyonunu PrestigeSO'da keşfedin.${page > 1 ? ` Sayfa ${page}.` : ""}`,
    alternates: { canonical: canonical.size ? `/shop?${canonical}` : "/shop" },
    robots: { index: !filtered, follow: true },
  };
}
