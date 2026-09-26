import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { fetchSearchReport, validateSearchQuery, type SearchQuery } from '@/lib/integrations/googleSearch';
import { consumeRateLimit, getClientIp } from '@/lib/rateLimit';
import { googleSearchFailure } from '@/lib/integrations/googleSearchStatus';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  if (process.env.GSC_READ_ONLY_ENABLED !== '1') return NextResponse.json({ error: 'Search Console bağlantısı kapalı. OAuth kurulumu ve salt okunur erişim doğrulaması gerekiyor.' }, { status: 503, headers });
  const q = req.nextUrl.searchParams;
  const query = { startDate: q.get('start') || '', endDate: q.get('end') || '', dimension: q.get('dimension') as SearchQuery['dimension'], startRow: Number(q.get('offset') || 0) };
  try { validateSearchQuery(query); } catch { return NextResponse.json({ error: 'Tarih aralığı veya rapor boyutu geçersiz (en fazla 93 gün).' }, { status: 400, headers }); }
  try {
    const limit = await consumeRateLimit({ bucket: 'gsc-read', identifier: getClientIp(req), maxRequests: 10, windowSeconds: 60 });
    if (!limit.allowed) return NextResponse.json({ error: 'İstek sınırı.' }, { status: 429, headers });
    const report = await fetchSearchReport({ clientId: process.env.GSC_CLIENT_ID || '', clientSecret: process.env.GSC_CLIENT_SECRET || '', refreshToken: process.env.GSC_REFRESH_TOKEN || '' }, query);
    return NextResponse.json(report, { headers });
  } catch (error) { const failure = googleSearchFailure(error); return NextResponse.json({ code: failure.code, error: failure.error }, { status: failure.status, headers }); }
}
