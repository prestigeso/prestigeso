'use client';
import {useEffect} from 'react';
import {COOKIE_CONSENT_STORAGE_KEY,COOKIE_CONSENT_VERSION,parseCookieConsent} from '@/lib/legal/consent';
import {safeStorageGet} from '@/lib/browserStorage';
/** Local permission evidence only. No pixel SDK, fbp/fbc, external requests or offline queue. */
export default function MarketingPreparation({enabled}:{enabled:boolean}){
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,chain=Promise.resolve();
  const update=()=>{
   const allowed=parseCookieConsent(safeStorageGet('local',COOKIE_CONSENT_STORAGE_KEY))?.marketing===true && !location.pathname.startsWith('/admin');
   // Serialize opt-in/revoke: a late opt-in response must not resurrect revoked consent.
   chain=chain.then(async()=>{if(stopped&&allowed)return;try{await fetch('/api/marketing/permission',allowed?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({allowed:true,version:COOKIE_CONSENT_VERSION}),signal:AbortSignal.timeout(5000)}:{method:'DELETE',keepalive:true,signal:AbortSignal.timeout(5000)});}catch{/* Retry latest preference on next page/view; never send conversion events. */}});
  };
  update();window.addEventListener('prestigeso:consent-changed',update);window.addEventListener('storage',update);
  return()=>{stopped=true;window.removeEventListener('prestigeso:consent-changed',update);window.removeEventListener('storage',update);};
 },[enabled]);return null;
}
