import {createHmac,timingSafeEqual} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function signMarketing(id:string,secret:string,now=Date.now()){
 if(!uuid.test(id)||secret.length<32)throw new Error('MARKETING_CONFIGURATION');
 const value=`${id}.${now+30*86400000}`;return `${value}.${createHmac('sha256',secret).update(`marketing-v1:${value}`).digest('hex')}`;
}
export function verifyMarketing(value:string,secret:string,now=Date.now()):string|null{
 const [id,expires,mac,...extra]=value.split('.');if(extra.length||secret.length<32||!uuid.test(id||'')||!/^\d{13}$/.test(expires||'')||Number(expires)<now||!/^[a-f0-9]{64}$/.test(mac||''))return null;
 const expected=createHmac('sha256',secret).update(`marketing-v1:${id}.${expires}`).digest('hex');return timingSafeEqual(Buffer.from(expected),Buffer.from(mac))?id:null;
}
