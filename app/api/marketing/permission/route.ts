import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest,isTrustedAdminMutationRequest} from '@/lib/adminRequest';
import {limitedJson} from '@/lib/http/limitedJson';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
import {consumeRateLimit,getClientIp} from '@/lib/rateLimit';
import {MARKETING_COOKIE,readMarketing} from '@/lib/marketing/server';
import {signMarketing} from '@/lib/marketing/identity';
const headers={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(!isTrustedAdminMutationRequest(req))return new NextResponse(null,{status:403,headers});
 if(process.env.MARKETING_PREPARATION_ENABLED!=='1')return new NextResponse(null,{status:503,headers});
 if(await isAdminRequest(req)||/bot|crawler|spider|headless/i.test(req.headers.get('user-agent')||''))return new NextResponse(null,{status:403,headers});
 try{const b=await limitedJson(req,1024) as Record<string,unknown>;if(b.allowed!==true||b.version!=='2026-09-17'||Object.keys(b).length!==2)return new NextResponse(null,{status:400,headers});
 const limit=await consumeRateLimit({bucket:'marketing-permission',identifier:getClientIp(req),maxRequests:20,windowSeconds:3600});if(!limit.allowed)return new NextResponse(null,{status:429,headers});
 const id=readMarketing(req)||randomUUID();const r=await supabaseAdmin.rpc('marketing_set_permission',{p_subject:id,p_allowed:true,p_version:b.version});if(r.error)throw r.error;
 const response=new NextResponse(null,{status:204,headers});response.cookies.set(MARKETING_COOKIE,signMarketing(id,process.env.RATE_LIMIT_SECRET||''),{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:30*86400});return response;
 }catch{return new NextResponse(null,{status:503,headers});}
}
export async function DELETE(req:NextRequest){
 if(!isTrustedAdminMutationRequest(req))return new NextResponse(null,{status:403,headers});
 const id=readMarketing(req);if(id){const r=await supabaseAdmin.rpc('marketing_set_permission',{p_subject:id,p_allowed:false,p_version:'2026-09-17'});if(r.error)return new NextResponse(null,{status:503,headers});}
 const r=new NextResponse(null,{status:204,headers});r.cookies.set(MARKETING_COOKIE,'',{path:'/',maxAge:0});return r;
}
