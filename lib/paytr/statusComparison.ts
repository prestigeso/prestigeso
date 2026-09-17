export type PaytrStatusResult = {
  status?: string;
  payment_amount?: string | number;
  payment_total?: string | number;
  currency?: string;
  payment_date?: string;
  returns?: unknown[];
  err_no?: string | number;
  err_msg?: string;
};

function cents(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Math.round(Number(text) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function comparePaytrStatus(localAmount: number, localRefundedAmount: number, remote: PaytrStatusResult) {
  const local = cents(localAmount);
  const refunded = cents(localRefundedAmount);
  const remotePayment = cents(remote.payment_amount);
  const remoteTotal = cents(remote.payment_total);
  let remoteRefunded: number | null = 0;
  if (remote.returns !== undefined && !Array.isArray(remote.returns)) remoteRefunded = null;
  else for (const entry of remote.returns || []) {
    const amount = entry && typeof entry === 'object' ? cents((entry as Record<string, unknown>).return_amount ?? (entry as Record<string, unknown>).amount) : null;
    if (amount === null || remoteRefunded === null) { remoteRefunded = null; break; }
    remoteRefunded += amount;
    if (!Number.isSafeInteger(remoteRefunded)) { remoteRefunded = null; break; }
  }
  const amountMatches = remote.status === 'success' && ['TL', 'TRY'].includes(String(remote.currency).toUpperCase()) &&
    local !== null && local > 0 && remotePayment === local && remoteTotal !== null && remoteTotal >= local;
  const refundMatches = refunded !== null && remoteRefunded === refunded;
  return { status: amountMatches && refundMatches ? 'matched' as const : 'mismatch' as const,
    canRecoverPayment: amountMatches && remoteRefunded === 0 && refunded === 0,
    detail: { localAmount, localRefundedAmount, remotePayment: remotePayment === null ? null : remotePayment / 100,
      remoteTotal: remoteTotal === null ? null : remoteTotal / 100, remoteRefunded: remoteRefunded === null ? null : remoteRefunded / 100,
      currency: remote.currency || null, paymentDate: remote.payment_date || null } };
}
