import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/adminRequest';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
const headers={'Cache-Control':'no-store'};
export async function GET(req:NextRequest){
 if(!await isAdminRequest(req))return NextResponse.json({error:'Yetkisiz erişim.'},{status:401,headers});
 if(process.env.MARKETING_PREPARATION_ENABLED!=='1')return NextResponse.json({preparationEnabled:false,dispatchEnabled:false,held:null,cancelled:null},{headers});
 const [held,cancelled]=await Promise.all(['held','cancelled'].map(status=>supabaseAdmin.from('marketing_purchase_outbox').select('order_id',{count:'exact',head:true}).eq('status',status)));
 if(held.error||cancelled.error)return NextResponse.json({error:'Hazırlık kuyruğu okunamadı.'},{status:503,headers});
 return NextResponse.json({preparationEnabled:true,dispatchEnabled:false,held:held.count,cancelled:cancelled.count},{headers});
}
