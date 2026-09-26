import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { checkSearchConnection } from '@/lib/integrations/googleSearch';
import { googleSearchFailure } from '@/lib/integrations/googleSearchStatus';
import { consumeRateLimit } from '@/lib/rateLimit';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  if (process.env.GSC_READ_ONLY_ENABLED !== '1') return NextResponse.json({ code: 'disabled', error: 'Bu sunucuda Google bağlantısı kapalı.' }, { status: 503, headers });
  try {
    const limit = await consumeRateLimit({ bucket: 'gsc-connection', identifier: 'store', maxRequests: 5, windowSeconds: 60 });
    if (!limit.allowed) return NextResponse.json({ code: 'rate_limit', error: 'Bağlantı denetimi sınırı; bir dakika bekleyin.' }, { status: 429, headers });
    return NextResponse.json(await checkSearchConnection({ clientId: process.env.GSC_CLIENT_ID || '', clientSecret: process.env.GSC_CLIENT_SECRET || '', refreshToken: process.env.GSC_REFRESH_TOKEN || '' }), { headers });
  } catch (error) {
    const failure = googleSearchFailure(error);
    return NextResponse.json({ code: failure.code, error: failure.error }, { status: failure.status, headers });
  }
}
