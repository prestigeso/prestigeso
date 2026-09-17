export function getPurchaseBlockText(
  status: "loading" | "ready" | "error",
  hasVariants: boolean,
  selected: boolean,
  selectedStock: number,
  totalStock: number,
): string | null {
  if (status === "loading") return "SEÇENEKLER YÜKLENİYOR";
  if (status === "error") return "BİLGİLER DOĞRULANAMADI";
  if (totalStock <= 0) return "TÜKENDİ";
  if (hasVariants && !selected) return "SEÇENEK SEÇİNİZ";
  return selectedStock <= 0 ? "TÜKENDİ" : null;
}
