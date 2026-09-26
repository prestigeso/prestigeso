import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { orderContribution } from '@/lib/finance/orderContribution';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!/^[1-9]\d{0,14}$/.test(id)) return NextResponse.json({ error: 'Geçersiz sipariş ID.' }, { status: 400, headers });
  try {
    const [order, snapshot, corrections] = await Promise.all([
      supabaseAdmin.from('orders').select('id,total_amount,refunded_amount,payment_status,paid_at').eq('id', id).maybeSingle(),
      supabaseAdmin.from('phase2_order_cost_snapshots').select('lines,captured_at').eq('order_id', id).maybeSingle(),
      supabaseAdmin.from('phase2_records').select('resource_key,payload').eq('kind', 'order_cost').in('resource_key', ['goods', 'paymentFees', 'packaging', 'shipping', 'returnCosts'].map(f => `${id}:${f}`)),
    ]);
    if (order.error || snapshot.error || corrections.error) throw new Error();
    if (!order.data) return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404, headers });
    return NextResponse.json({ orderId: id, snapshotAt: snapshot.data?.captured_at || null, ...orderContribution(order.data, snapshot.data?.lines || null, corrections.data || []) }, { headers });
  } catch { return NextResponse.json({ error: 'Sipariş maliyeti doğrulanamadı; eksik veri sıfır sayılmadı.' }, { status: 503, headers }); }
}
