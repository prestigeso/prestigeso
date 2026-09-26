import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { limitedJson } from '@/lib/http/limitedJson';
import { consumeRateLimit, getClientIp } from '@/lib/rateLimit';
import { validateFinanceRecord } from '@/lib/finance/records';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  const q = req.nextUrl.searchParams;
  const kind = q.get('kind');
  if (!['product_cost', 'order_cost', 'advertising', 'sku_mapping'].includes(kind || '')) return NextResponse.json({ error: 'Kayıt türü geçersiz.' }, { status: 400, headers });
  const key = q.get('key');
  let query = supabaseAdmin.from(q.get('history') === '1' ? 'phase2_record_history' : 'phase2_records').select('kind,resource_key,version,payload').eq('kind', kind!).order('resource_key').order('version', { ascending: false }).limit(101);
  if (key) query = query.eq('resource_key', key);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Kayıtlar okunamadı. Faz 2 migration durumunu kontrol edin.' }, { status: 503, headers });
  return NextResponse.json({ records: (data || []).slice(0, 100), truncated: (data || []).length > 100 }, { headers });
}
export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  let record: ReturnType<typeof validateFinanceRecord>;
  try { record = validateFinanceRecord(await limitedJson(req, 4096)); } catch { return NextResponse.json({ error: 'Kayıt alanları geçersiz; anahtar, tutar, vergi esası ve açıklamayı kontrol edin.' }, { status: 400, headers }); }
  try {
    const rate = await consumeRateLimit({ bucket: 'phase2-record-write', identifier: getClientIp(req), maxRequests: 30, windowSeconds: 60 });
    if (!rate.allowed) return NextResponse.json({ error: 'İstek sınırı.' }, { status: 429, headers });
    const { data, error } = await supabaseAdmin.rpc('phase2_save_record', { p_request: record.requestId, p_kind: record.kind, p_key: record.key, p_expected: record.expectedVersion, p_payload: record.payload });
    if (error) {
      const conflict = /VERSION_CONFLICT|IDEMPOTENCY_CONFLICT/.test(error.message);
      const invalid = /SKU_NOT_FOUND|ORDER_NOT_FOUND|INVALID_/.test(error.message);
      return NextResponse.json({ error: conflict ? 'Kayıt değişmiş veya istek çakışıyor. Güncel kaydı yeniden yükleyin.' : invalid ? 'Ürün/sipariş bulunamadı veya kayıt geçersiz.' : 'Kaydetme doğrulanamadı. Aynı isteği tekrar deneyebilir veya kayıt geçmişini kontrol edebilirsiniz.' }, { status: conflict ? 409 : invalid ? 400 : 503, headers });
    }
    return NextResponse.json({ version: data }, { headers });
  } catch { return NextResponse.json({ error: 'Kaydetme doğrulanamadı; aynı isteği tekrar deneyin.' }, { status: 503, headers }); }
}
