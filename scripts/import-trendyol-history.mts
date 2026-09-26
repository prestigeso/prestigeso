import {createClient} from '@supabase/supabase-js';
import {fetchTrendyolStream} from '../lib/trendyol/stream.ts';

// Explicit operator action only. No order, inventory, payment or provider writes.
if (!process.argv.includes('--apply')) throw new Error('Explicit --apply required');
const sellerId=process.env.TRENDYOL_SELLER_ID || '';
const environment=process.env.TRENDYOL_ENVIRONMENT;
if(environment!=='production'&&environment!=='stage')throw new Error('Invalid environment');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const end=Date.now(),begin=new Date(end);begin.setUTCMonth(begin.getUTCMonth()-2);
let pages=0,processed=0;
for(let start=begin.getTime();start<end;){
 const finish=Math.min(start+14*86400000,end);
 const job=await db.rpc('trendyol_begin_sync',{p_seller:sellerId,p_environment:environment,p_start:start,p_end:finish});
 if(job.error)throw new Error(`Begin failed: ${job.error.code}`);
 let cursor:string|null=null,revision=0;
 for(let i=0;i<2000;i++){
  if(pages)await new Promise(r=>setTimeout(r,5500));
  const page=await fetchTrendyolStream({sellerId,environment,apiKey:process.env.TRENDYOL_API_KEY||'',apiSecret:process.env.TRENDYOL_API_SECRET||'',buyerSecret:process.env.TRENDYOL_BUYER_HASH_SECRET},{start,end:finish,cursor});
  if(page.buyers){const result=await db.rpc('trendyol_record_buyers',{p_seller:sellerId,p_environment:environment,p_buyers:page.buyers});if(result.error)throw new Error(`Buyers failed: ${result.error.code}`);}
  const saved=await db.rpc('trendyol_apply_sync_page',{p_job:job.data,p_revision:revision,p_packages:page.packages,p_cursor:page.nextCursor,p_more:page.hasMore});
  if(saved.error)throw new Error(`Apply failed: ${saved.error.code}`);
  revision=saved.data;pages++;processed+=page.packages.length;
  console.log(JSON.stringify({windowStart:new Date(start).toISOString(),windowEnd:new Date(finish).toISOString(),pages,processed,windowComplete:!page.hasMore}));
  if(!page.hasMore)break;
  if(i===1999)throw new Error('Capacity reached');
  cursor=page.nextCursor;
 }
 start=finish;
}
const check=await db.from('trendyol_package_mirror').select('package_id',{count:'exact',head:true}).eq('seller_id',sellerId).eq('environment',environment).gte('payload->>orderDate',String(begin.getTime())).lte('payload->>orderDate',String(end));
if(check.error)throw new Error(`Verify failed: ${check.error.code}`);
console.log(JSON.stringify({complete:true,from:begin.toISOString(),to:new Date(end).toISOString(),pages,processed,archivedPackagesInOrderPeriod:check.count}));
