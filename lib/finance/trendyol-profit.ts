type TrendyolProfitPackage = {
  status: string;
  currency: string;
  amount: number;
  grossAmount: number | null;
  discount: number | null;
  lines: { status: string | null; cancelReason: string | null }[];
};

const saleStatuses = new Set(['Created', 'Picking', 'Invoiced', 'Shipped', 'Delivered', 'AtCollectionPoint']);

export function classifyTrendyolProfitPackage(p: TrendyolProfitPackage, returned: boolean) {
  if (returned) return { eligible: false, exclusion: 'İade kaydı var; geri ödeme ve kargo gideri mutabakatı gerekli', discountFundingUnknown: false };
  if (p.currency !== 'TRY') return { eligible: false, exclusion: 'Desteklenmeyen para birimi', discountFundingUnknown: false };
  if (p.status === 'Cancelled' || p.lines.some(l => Boolean(l.cancelReason) || l.status === 'Cancelled')) {
    return { eligible: false, exclusion: 'İptal edilen paket', discountFundingUnknown: false };
  }
  if (!saleStatuses.has(p.status) || p.lines.some(l => ['Returned', 'UnDelivered'].includes(l.status || ''))) {
    return { eligible: false, exclusion: 'Satış durumu doğrulanmadı', discountFundingUnknown: false };
  }
  if (p.discount === null || p.discount < 0 || (p.discount > 0 && p.grossAmount === null) || (p.grossAmount !== null && Math.abs(Math.round(p.grossAmount * 100) - Math.round(p.discount * 100) - Math.round(p.amount * 100)) > 1)) {
    return { eligible: false, exclusion: 'İndirimli paket tutarı doğrulanamadı', discountFundingUnknown: false };
  }
  // packageTotalPrice is already after both seller and Trendyol discounts.
  // The provider split was not stored for historical packages, so its subsidy is not added.
  return { eligible: true, exclusion: undefined, discountFundingUnknown: p.discount > 0 };
}
