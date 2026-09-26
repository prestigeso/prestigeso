"use client";
import {useEffect,useEffectEvent,useRef} from 'react';
/** Read when actually shown, not when retained in a hidden pane. No writes. */
export function useVisibleRead(read:()=>void|Promise<void>,key=''){
 const ref=useRef<HTMLElement|null>(null),last=useRef(0);
 const onRead=useEffectEvent(()=>void read());
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  last.current=0;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)&&Date.now()-last.current>120000){last.current=Date.now();onRead();}
  });observer.observe(el);return()=>observer.disconnect();
 },[key]);
 return ref;
}
