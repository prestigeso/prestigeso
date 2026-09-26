import {createHash} from 'node:crypto';
/** Offline contract builder, deliberately no fetch/SDK/dispatcher. */
export function prepareMetaPurchase(row:{eventId:string;subjectId:string;status:string;allowed:boolean;payload:unknown},now=Date.now()){
 if(row.status!=='held'||!row.allowed||!row.subjectId||!/^[a-f0-9-]{36}$/i.test(row.eventId))throw new Error('CONSENT_OR_EVENT_REQUIRED');
 const p=row.payload as Record<string,unknown>|null;
 if(!p || p.event_name!=='Purchase' || p.action_source!=='website' || !Number.isSafeInteger(p.event_time) || Number(p.event_time)*1000>now+60000 || Number(p.event_time)*1000<now-7*86400000)throw new Error('INVALID_PURCHASE');
 const c=p.custom_data as Record<string,unknown>|undefined;
 if(!c || c.currency!=='TRY'|| typeof c.value!=='number'|| !Number.isFinite(c.value)||c.value<=0||c.value>1e9||!Array.isArray(c.content_ids)||c.content_ids.length>500||c.content_ids.some(x=>typeof x!=='string'||!/^\d+$/.test(x)))throw new Error('INVALID_PURCHASE');
 const custom={currency:'TRY',value:c.value,content_type:'product',content_ids:c.content_ids};
 const server={event_name:'Purchase',event_id:row.eventId,event_time:p.event_time,action_source:'website',event_source_url:'https://www.prestigeso.com.tr/odeme/basarili',user_data:{external_id:[createHash('sha256').update(row.subjectId).digest('hex')]},custom_data:custom};
 return {server,browser:{eventName:'Purchase',parameters:custom,options:{eventID:row.eventId}},dispatchEnabled:false as const};
}
