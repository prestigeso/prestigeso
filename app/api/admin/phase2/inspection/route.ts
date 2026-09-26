import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/adminRequest';
import {limitedJson} from '@/lib/http/limitedJson';
import {consumeRateLimit} from '@/lib/rateLimit';
import {inspectSearchUrl,validateInspectionUrl} from '@/lib/integrations/googleSearch';
import {googleSearchFailure} from '@/lib/integrations/googleSearchStatus';
const headers={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(!await isAdminRequest(req))return NextResponse.json({error:'Yetkisiz erişim.'},{status:401,headers});
 if(process.env.GSC_READ_ONLY_ENABLED!=='1')return NextResponse.json({error:'Google bağlantısı kapalı.'},{status:503,headers});
 let url:string;try{const b=await limitedJson(req,4096) as {url:unknown};if(typeof b.url!=='string')throw new Error();url=validateInspectionUrl(b.url);}catch{return NextResponse.json({error:'Yalnız mağazanın herkese açık HTTPS adreslerini girin; özel/token içeren adresler gönderilemez.'},{status:400,headers});}
 try{const r=await consumeRateLimit({bucket:'gsc-inspection',identifier:'store',maxRequests:10,windowSeconds:60});if(!r.allowed)return NextResponse.json({error:'Denetim sınırı.'},{status:429,headers});
 return NextResponse.json(await inspectSearchUrl({clientId:process.env.GSC_CLIENT_ID || '',clientSecret:process.env.GSC_CLIENT_SECRET || '',refreshToken:process.env.GSC_REFRESH_TOKEN || ''},url),{headers});
 }catch(error){const failure=googleSearchFailure(error);return NextResponse.json({code:failure.code,error:failure.error},{status:failure.status,headers});}
}
