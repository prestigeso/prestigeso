import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const period = req.nextUrl.searchParams.get("period") || "28d";
  if (!["48h", "7d", "28d", "90d", "365d"].includes(period))
    return NextResponse.json({ error: "Geçersiz dönem." }, { status: 400 });
  const { data, error } = await supabaseAdmin.rpc("admin_customer_growth", {
    p_period: period,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          "Müşteri raporu alınamadı. Admin Studio veritabanı güncellemesini ve bağlantıyı kontrol edin.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const seller=process.env.TRENDYOL_SELLER_ID,environment=process.env.TRENDYOL_ENVIRONMENT;
  let trendyol: typeof data | null=null;
  if(seller&&['production','stage'].includes(environment||'')){
    const rows:{first_order_at:string}[]=[];
    for(let offset=0;offset<=20000;offset+=1000){
      const r=await supabaseAdmin.from('trendyol_buyers').select('first_order_at,buyer_key',{count:'exact'}).eq('seller_id',seller).eq('environment',environment!).order('buyer_key').range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
      if(r.error||r.count===null||r.count>20000)break;
      rows.push(...r.data);
      if(rows.length>=r.count){
        if(rows.length){
          const since=Date.now()-(period==='48h'?2:parseInt(period))*86400000;
          const recent=rows.filter(x=>Date.parse(x.first_order_at)>=since).sort((a,b)=>Date.parse(a.first_order_at)-Date.parse(b.first_order_at));
          const buckets=new Map<string,number>();
          for(const x of recent){const label=new Date(x.first_order_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',...(period==='365d'?{}:{day:'2-digit'}),...(period==='48h'?{hour:'2-digit'}:{})});buckets.set(label,(buckets.get(label)||0)+1);}
          trendyol={total:rows.length,newCustomers:recent.length,series:[...buckets].map(([label,value])=>({label,value}))};
        }
        break;
      }
      if(!r.data.length)break;
    }
  }
  return NextResponse.json({...data,store:data,trendyol}, { headers: { "Cache-Control": "no-store" } });
}
