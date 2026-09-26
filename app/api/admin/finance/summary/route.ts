import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/adminRequest';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
import {buildSalesReport} from '@/lib/finance/sales-report';
import {archiveCoverage, type ArchiveJob} from '@/lib/trendyol/archive-coverage';
import type {OrderRow} from '@/lib/analytics/report';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const headers={'Cache-Control':'no-store'};
 if(!await isAdminRequest(req))return NextResponse.json({error:'Yetkisiz erişim.'},{status:401,headers});
 const days=Number(req.nextUrl.searchParams.get('days')||28);
 if(![1,2,7,14,28,30,90,365].includes(days))return NextResponse.json({error:'Geçersiz dönem.'},{status:400,headers});
 const now=Date.now(),since=now-days*86400000;
 try{
  const orders:OrderRow[]=[];
  const packages:Parameters<typeof buildSalesReport>[1]=[];
  let trendArchive:ReturnType<typeof archiveCoverage>|null=null;
  for(let offset=0;;offset+=1000){
   const r=await supabaseAdmin.from('orders').select('id,payment_status,total_amount,refunded_amount,paid_at,created_at',{count:'exact'}).gte('paid_at',new Date(since).toISOString()).lt('paid_at',new Date(now).toISOString()).order('id').range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
   if(r.error||r.count===null||r.count>20000)throw new Error('STORE_READ');
   orders.push(...r.data as OrderRow[]);if(orders.length>=r.count)break;if(!r.data.length)throw new Error('INCOMPLETE');
  }
  const seller=process.env.TRENDYOL_SELLER_ID,environment=process.env.TRENDYOL_ENVIRONMENT;
  if(seller){
   if(!['production','stage'].includes(environment||''))throw new Error('CONFIG');
   const jobs=await supabaseAdmin.from('trendyol_sync_jobs').select('starts_at,ends_at,status')
    .eq('seller_id',seller).eq('environment',environment!).gte('ends_at',String(since)).order('starts_at').limit(1001).abortSignal(AbortSignal.timeout(8000));
   if(jobs.error||!jobs.data||jobs.data.length>1000)throw new Error('ARCHIVE_COVERAGE');
   trendArchive=archiveCoverage(since,now,jobs.data as ArchiveJob[]);
   for(let offset=0;;offset+=1000){
    const r=await supabaseAdmin.from('trendyol_package_mirror').select('payload',{count:'exact'}).eq('seller_id',seller).eq('environment',environment!).gte('payload->>orderDate',String(since)).lt('payload->>orderDate',String(now)).order('package_id').range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
    if(r.error||r.count===null||r.count>20000)throw new Error('ARCHIVE_READ');
    packages.push(...r.data.map(x=>x.payload));if(packages.length>=r.count)break;if(!r.data.length)throw new Error('INCOMPLETE');
   }
  }
  const base=buildSalesReport(orders,packages,days,now);
  const report={...base,trendyolArchive:trendArchive,
   coverage:trendArchive&&!trendArchive.complete
    ? `${base.coverage} Seçili dönemin Trendyol arşivi tam/güncel değil; görünen Trendyol satışları kısmi olabilir.`
    : base.coverage};
  if(req.nextUrl.searchParams.get('overview')==='1'){
   const visits:{created_at:string}[]=[];
   for(let offset=0;;offset+=1000){
    const r=await supabaseAdmin.from('page_views').select('id,created_at',{count:'exact'}).gte('created_at',new Date(since).toISOString()).lt('created_at',new Date(now).toISOString()).order('id').range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
    if(r.error||r.count===null||r.count>20000)throw new Error('VISITS_READ');
    visits.push(...r.data);if(visits.length>=r.count)break;if(!r.data.length)throw new Error('INCOMPLETE');
   }
   return NextResponse.json({...report,visits:visits.length,series:report.series.map(row=>({...row,visits:visits.filter(v=>{const t=Date.parse(v.created_at);return t>=row.timestamp&&t<row.timestamp+(days<=2?3600000:86400000);}).length}))},{headers});
  }
  return NextResponse.json(report,{headers});
 }catch{return NextResponse.json({error:'Birleşik satış raporu tamamlanamadı. Mağaza ve Trendyol arşiv bağlantısını kontrol edin; eksik toplam gösterilmedi.'},{status:503,headers});}
}
