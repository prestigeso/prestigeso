export type CatalogProduct = { SKU: string; barcode: string | null };
export type MarketplaceLine = { sku: string; barcode?: string | null };

export function resolveSiteSku(line: MarketplaceLine, products: CatalogProduct[], mappings: Map<string, string>): string | null {
  const mapped = mappings.get(line.sku);
  if (mapped) return products.some(product => product.SKU === mapped) ? mapped : null;
  const bySku = products.filter(product => product.SKU === line.sku);
  if (bySku.length === 1) return bySku[0].SKU;
  if (!line.barcode) return null;
  const byBarcode = products.filter(product => product.barcode && product.barcode === line.barcode);
  return byBarcode.length === 1 ? byBarcode[0].SKU : null;
}
