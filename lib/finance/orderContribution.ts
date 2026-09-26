import { calculateContribution, parseTryAmount, type ContributionInput } from './contribution.ts';
type Saved = { resource_key: string; payload: { amountMinor?: number | null; taxBasis?: string } };
type Line = { quantity: unknown; unitCost: { amountMinor?: number | null; taxBasis?: string } | null };
export function orderContribution(order: { id: number; total_amount: string | number; refunded_amount: string | number | null; payment_status: string; paid_at: string | null }, lines: Line[] | null, corrections: Saved[]) {
  const input: ContributionInput = { revenue: null, refunds: null, goods: null, paymentFees: null, packaging: null, shipping: null, returnCosts: null, advertising: null };
  const warnings: string[] = [];
  if (!order.paid_at || !['paid', 'partially_refunded', 'refunded'].includes(order.payment_status)) return { eligible: false, input, result: null, warnings: ['Doğrulanmış tahsilat yok.'] };
  input.revenue = parseTryAmount(String(order.total_amount));
  input.refunds = order.refunded_amount === null ? null : parseTryAmount(String(order.refunded_amount));
  if (lines?.length) {
    let sum = 0, known = true;
    for (const line of lines) {
      const c = line.unitCost;
      if (!Number.isSafeInteger(line.quantity) || Number(line.quantity) < 1 || !c || c.taxBasis !== 'inclusive' || c.amountMinor === null || c.amountMinor === undefined || !Number.isSafeInteger(c.amountMinor) || c.amountMinor < 0) { known = false; continue; }
      sum += Number(line.quantity) * c.amountMinor;
    }
    if (known && Number.isSafeInteger(sum) && sum <= 100_000_000_000) input.goods = sum;
  }
  if (input.refunds === null || input.refunds > 0) { input.goods = null; warnings.push('İade sonrası geri kazanılan ürün maliyeti bilinmiyor; net goods düzeltmesi girilmelidir.'); }
  for (const c of corrections) {
    const [id, field] = c.resource_key.split(':');
    if (id !== String(order.id) || !['goods', 'paymentFees', 'packaging', 'shipping', 'returnCosts'].includes(field)) continue;
    const key = field as keyof ContributionInput;
    if (c.payload.taxBasis !== 'inclusive') { input[key] = null; warnings.push(`${field}: KDV hariç maliyet, KDV dahil tahsilatla karıştırılmadı.`); }
    else input[key] = c.payload.amountMinor ?? null;
  }
  warnings.push('Reklam gideri bu siparişe otomatik paylaştırılmadı. Vergi/genel giderler kapsamlı değil; net kâr değildir.');
  return { eligible: true, input, result: calculateContribution(input), warnings };
}
