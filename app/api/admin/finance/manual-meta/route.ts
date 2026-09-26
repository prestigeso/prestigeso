import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { limitedJson } from '@/lib/http/limitedJson';
import { consumeRateLimit, getClientIp } from '@/lib/rateLimit';
import { manualMetaEntry, validateManualMeta } from '@/lib/finance/manual-meta';
export const runtime = 'nodejs';
const headers = { 'Cache-Control':'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error:'Yetkisiz erişim.' },{status:401,headers});
  try {
    const { data,error } = await supabaseAdmin.from('phase2_records').select('resource_key,version,payload').eq('kind','advertising').order('resource_key').limit(1001).abortSignal(AbortSignal.timeout(8000));
    if (error || !data || data.length > 1000) throw new Error('INCOMPLETE');
    return NextResponse.json({ entries:data.map(manualMetaEntry).filter(Boolean) },{headers});
  } catch { return NextResponse.json({error:'Reklam kayıtları tam olarak okunamadı.'},{status:503,headers}); }
}
export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error:'Yetkisiz erişim.' },{status:401,headers});
  let record: ReturnType<typeof validateManualMeta>;
  try { record=validateManualMeta(await limitedJson(req,4096)); } catch { return NextResponse.json({error:'Reklam tutarı, tarih aralığı veya kanal geçersiz.'},{status:400,headers}); }
  try {
    const rate=await consumeRateLimit({bucket:'manual-meta-write',identifier:getClientIp(req),maxRequests:15,windowSeconds:60});
    if (!rate.allowed) return NextResponse.json({error:'İstek sınırı.'},{status:429,headers});
    const {data,error}=await supabaseAdmin.rpc('phase2_save_record',{p_request:record.requestId,p_kind:'advertising',p_key:record.key,p_expected:record.expectedVersion,p_payload:record.payload});
    if (error) return NextResponse.json({error:/VERSION_CONFLICT|IDEMPOTENCY_CONFLICT/.test(error.message)?'Kayıt değişmiş; yeniden yükleyin.':'Kayıt doğrulanamadı; aynı değerlerle tekrar deneyin.'},{status:/VERSION_CONFLICT|IDEMPOTENCY_CONFLICT/.test(error.message)?409:503,headers});
    return NextResponse.json({key:record.key,version:data},{headers});
  } catch { return NextResponse.json({error:'Kayıt doğrulanamadı; aynı değerlerle tekrar deneyin.'},{status:503,headers}); }
}
