import {createHmac} from 'node:crypto';
export function projectBuyers(body:unknown,secret:string,seller:string,environment:string){
 if(secret.length<32)throw new Error('BUYER_SECRET_REQUIRED');
 const content=(body as {content?:Record<string,unknown>[]})?.content;
 if(!Array.isArray(content))throw new Error('BUYER_SCHEMA');
 const accepted=new Set(['Created','Picking','Invoiced','Shipped','Delivered','AtCollectionPoint','Returned']);
 return content.flatMap(p=>{
  const id=p.customerId;
  if(!accepted.has(String(p.shipmentPackageStatus||p.status)))return [];
  if(!(typeof id==='string'&&/^[1-9][0-9]{0,30}$/.test(id))&&!(typeof id==='number'&&Number.isSafeInteger(id)&&id>0))return [];
  if(!Number.isSafeInteger(p.orderDate)||Number(p.orderDate)<0)return [];
  return [{buyer_key:createHmac('sha256',secret).update(`trendyol-buyer-v1:${environment}:${seller}:${id}`).digest('hex'),first_order_at:new Date(Number(p.orderDate)).toISOString()}];
 });
}
