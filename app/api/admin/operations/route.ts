import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { consumeRateLimit } from '@/lib/rateLimit';
import { dispatchTransactionEmail } from '@/lib/email/transactionalOutbox';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  const [payments, emails] = await Promise.all([
    supabaseAdmin.from('payment_recovery_exceptions')
      .select('id,order_id,kind,reason_code,confirmed_amount,created_at')
      .eq('status', 'open').order('created_at', { ascending: true }).limit(50),
    supabaseAdmin.from('transactional_email_outbox')
      .select('id,order_id,event_key,status,attempts,error_code,first_attempt_at,next_attempt_at,created_at')
      .neq('status', 'sent').order('created_at', { ascending: true }).limit(50),
  ]);
  if (payments.error || emails.error) return NextResponse.json({ error: 'Operasyon kuyruğu okunamadı; veritabanı migration durumunu kontrol edin.' }, { status: 503 });
  return NextResponse.json({ payments: payments.data, emails: emails.data, limit: 50 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  try {
    const body = await req.json();
    if (body?.action !== 'dispatch_email' || typeof body.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))
      return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
    const limit = await consumeRateLimit({ bucket: 'admin-outbox-dispatch', identifier: body.id, maxRequests: 5, windowSeconds: 3600 });
    if (!limit.allowed) return NextResponse.json({ error: 'Yeniden deneme limiti aşıldı.' }, { status: 429 });
    const result = await dispatchTransactionEmail(body.id);
    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Gönderim doğrulanamadı. Kayıt korunuyor; yeni bir mail olayı oluşturmayın.' }, { status: 503 });
  }
}
