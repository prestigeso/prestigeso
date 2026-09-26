import 'server-only';
import type {NextRequest} from 'next/server';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
import {verifyMarketing} from './identity';
export const MARKETING_COOKIE='prestigeso_marketing_preparation';
export function readMarketing(req:NextRequest){return verifyMarketing(req.cookies.get(MARKETING_COOKIE)?.value||'',process.env.RATE_LIMIT_SECRET||'');}
export async function linkMarketingOrder(req:NextRequest,merchant:string){
 if(process.env.MARKETING_PREPARATION_ENABLED!=='1' || process.env.PAYTR_TEST_MODE!=='0')return;
 const id=readMarketing(req);if(!id)return;
 try{await supabaseAdmin.rpc('marketing_link_order',{p_subject:id,p_merchant:merchant}).abortSignal(AbortSignal.timeout(1500));}catch{/* Financial checkout must not depend on optional attribution. */}
}
