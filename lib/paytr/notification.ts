import { createPaytrCallbackHash, verifyPaytrCallbackHash } from './signatures.ts';

export function validatePaytrNotification(form: URLSearchParams, secrets: { merchantKey: string; merchantSalt: string }) {
  const keys = ['merchant_oid', 'status', 'total_amount', 'hash'];
  if (keys.some(key => form.getAll(key).length !== 1)) return { ok: false as const, reason: 'invalid payload' };
  const merchantOid = form.get('merchant_oid') || '';
  const status = form.get('status') || '';
  const amountText = form.get('total_amount') || '';
  const totalAmount = Number(amountText);
  if (!/^[A-Za-z0-9]{1,64}$/.test(merchantOid) || !['success', 'failed'].includes(status) ||
      !/^[1-9][0-9]{0,12}$/.test(amountText) || !Number.isSafeInteger(totalAmount))
    return { ok: false as const, reason: 'invalid payload' };
  const expectedHash = createPaytrCallbackHash({ merchantOid, status: status as 'success' | 'failed',
    totalAmount: amountText, merchantKey: secrets.merchantKey, merchantSalt: secrets.merchantSalt });
  if (!verifyPaytrCallbackHash(expectedHash, form.get('hash') || '')) return { ok: false as const, reason: 'bad hash' };
  return { ok: true as const, notification: { merchantOid, status: status as 'success' | 'failed', totalAmount,
    failureReason: (form.get('failed_reason_msg') || 'Ödeme başarısız.').slice(0, 500) } };
}
