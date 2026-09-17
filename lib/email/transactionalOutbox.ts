import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createOrderTrackingToken } from '@/lib/paytr/signatures';
import { runEmailDelivery, type ClaimedEmail, type EmailPayload } from './outboxWorkflow';

export type TransactionalEmailInput = {
  orderId: number;
  eventKey: string;
  recipient: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
};

function configuredSender() {
  const from = String(process.env.RESEND_FROM_EMAIL || '').trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(from)) throw new Error('EMAIL_SENDER_NOT_CONFIGURED');
  return `PrestigeSO <${from}>`;
}

export async function enqueueTransactionEmail(input: TransactionalEmailInput) {
  const recipient = input.recipient.trim().toLowerCase();
  if (!Number.isSafeInteger(input.orderId) || input.orderId <= 0 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient) ||
      !/^[a-zA-Z0-9:_-]{1,160}$/.test(input.eventKey) || !input.html ||
      !input.subject || input.subject.length > 300 || /[\r\n]/.test(input.subject)) throw new Error('INVALID_EMAIL_EVENT');
  const payload: EmailPayload = {
    from: configuredSender(),
    to: [recipient], subject: input.subject, html: input.html,
    ...(input.attachments ? { attachments: input.attachments } : {}),
  };
  const { data, error } = await supabaseAdmin.rpc('enqueue_transactional_email', {
    p_order_id: input.orderId, p_event_key: input.eventKey, p_recipient: recipient, p_payload: payload,
  });
  if (error || !data?.id) throw new Error('EMAIL_EVENT_NOT_RECORDED');
  return data as { id: string; status: 'pending' | 'sent' | 'failed' | 'unknown' };
}

function parseObject(value: unknown): Record<string, unknown> {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

async function prepareConfirmation(id: string) {
  const { data: row, error } = await supabaseAdmin.from('transactional_email_outbox')
    .select('id,order_id,event_key,recipient,payload').eq('id', id).maybeSingle();
  if (error || !row) throw new Error('EMAIL_EVENT_NOT_FOUND');
  if (row.payload) return;
  if (row.event_key !== 'order_confirmation') throw new Error('EMAIL_PAYLOAD_NOT_READY');
  const { data: order, error: orderError } = await supabaseAdmin.from('orders')
    .select('id,order_no,user_id,merchant_oid,shipping_address,items,total_amount,payment_recovery_status')
    .eq('id', row.order_id).single();
  if (orderError || !order || order.payment_recovery_status === 'manual_review') throw new Error('EMAIL_ORDER_NOT_READY');
  const orderNumber = String(order.order_no || '');
  if (!orderNumber || orderNumber.length > 100 || /[\r\n]/.test(orderNumber)) throw new Error('INVALID_ORDER_NUMBER');
  const shipping = parseObject(order.shipping_address);
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const key = process.env.PAYTR_MERCHANT_KEY;
  if (!order.user_id && !key) throw new Error('EMAIL_TRACKING_NOT_CONFIGURED');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prestigeso.com.tr';
  const trackingUrl = order.user_id ? `${siteUrl}/profile` :
    `${siteUrl}/siparis-takip?oid=${encodeURIComponent(order.merchant_oid)}&token=${encodeURIComponent(createOrderTrackingToken(order.merchant_oid, key!))}`;
  const { render } = await import('@react-email/render');
  const { createElement } = await import('react');
  const { OrderConfirmation } = await import('@/components/emails/OrderConfirmation');
  const payload: EmailPayload = {
    from: configuredSender(),
    to: [row.recipient], subject: `Siparişiniz Alındı (${orderNumber}) - PrestigeSO`,
    html: await render(createElement(OrderConfirmation, {
      orderId: orderNumber, customerName: `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || 'Müşterimiz',
      items: Array.isArray(items) ? items : [], totalAmount: Number(order.total_amount), trackingUrl,
    })),
  };
  // Competing workers may render, but only the first immutable snapshot wins.
  const { error: updateError } = await supabaseAdmin.from('transactional_email_outbox')
    .update({ payload }).eq('id', id).is('payload', null).is('first_attempt_at', null);
  if (updateError) throw new Error('EMAIL_PAYLOAD_NOT_RECORDED');
}

export async function dispatchTransactionEmail(id: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return { status: 'not_configured' as const };
  await prepareConfirmation(id);
  return runEmailDelivery(id, {
    apiKey: process.env.RESEND_API_KEY, now: Date.now, fetch,
    async claim(emailId) {
      const { data, error } = await supabaseAdmin.rpc('claim_transactional_email', { p_id: emailId });
      if (error) throw new Error('EMAIL_CLAIM_FAILED');
      return data as ClaimedEmail | null;
    },
    async finish(row, result) {
      const { data, error } = await supabaseAdmin.rpc('finish_transactional_email', {
        p_id: row.id, p_lease_token: row.lease_token, p_status: result.status,
        p_provider_id: result.providerId || null, p_error_code: result.errorCode || null, p_retry: result.retry,
      });
      if (error) throw new Error('EMAIL_RESULT_NOT_RECORDED');
      return data === true;
    },
  });
}

export async function dispatchPendingTransactionEmails(limit = 10) {
  const { data, error } = await supabaseAdmin.from('transactional_email_outbox').select('id')
    .neq('status', 'sent').lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true }).limit(Math.min(Math.max(limit, 1), 30));
  if (error) throw new Error('EMAIL_QUEUE_LOOKUP_FAILED');
  const results = await Promise.allSettled((data || []).map(row => dispatchTransactionEmail(row.id)));
  return { attempted: results.length, sent: results.filter(result => result.status === 'fulfilled' && result.value.status === 'sent').length,
    attention: results.filter(result => result.status === 'rejected' || result.value.status === 'unknown' || result.value.status === 'failed').length };
}
