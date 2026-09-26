"use client";
import { useEffect, useRef, useState } from "react";
import type { projectPackages } from "@/lib/trendyol/packages";
import { safeProviderLink } from "@/lib/trendyol/packages";
import s from "./OrderDetail.module.css";
type Package = ReturnType<typeof projectPackages>["packages"][number];
const labels: Record<string,string> = { Created:"Sipariş alındı", Picking:"Hazırlanıyor", Invoiced:"Faturalandı", Shipped:"Kargoda", Delivered:"Teslim edildi", Cancelled:"İptal edildi", Returned:"İade edildi", UnDelivered:"Teslim edilemedi", UnPacked:"Paket bölündü", UnSupplied:"Tedarik edilemedi", Awaiting:"Ödeme onayı bekleniyor", AtCollectionPoint:"Teslimat noktasında" };
const claimLabels: Record<string,string> = { Accepted:'Kabul edildi', Rejected:'Reddedildi', Cancelled:'İptal edildi', Pending:'İnceleniyor', Created:'Talep oluşturuldu', Unknown:'Durum belirsiz' };
const date = (n: number | string | null | undefined) => n && Number.isFinite(new Date(n).getTime()) ? new Date(n).toLocaleString("tr-TR", {timeZone:"Europe/Istanbul"}) : "Bilgi paylaşılmadı";
function Fields({rows}:{rows:[string, string | number | null | undefined][]}) { return <dl className={s.fields}>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? "Bilgi paylaşılmadı"}</dd></div>)}</dl>; }
type OrderFinance = {
 claims: { claim_id:string;original_package_id:string|null;claim_date:number;modified_at:number;statuses:string[] }[];
 returns: { transaction_id:string;package_id:string|null;transaction_at:string;debt:number;credit:number;commission_amount:number|null;seller_revenue:number|null }[];
 lastChecked:string|null;
};
export default function TrendyolOrderDetail({pkg,onClose}:{pkg:Package;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 const [finance,setFinance]=useState<OrderFinance|null>(null);
 const [financeError,setFinanceError]=useState('');
 const [financeLoading,setFinanceLoading]=useState(true);
 useEffect(()=>{ const dialog=ref.current; const previous=document.activeElement as HTMLElement|null; dialog?.showModal(); const overflow=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{dialog?.close();document.body.style.overflow=overflow;previous?.focus();}; },[]);
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){
   setFinanceLoading(true);setFinance(null);setFinanceError('');
   try {
    const response=await fetch(`/api/admin/trendyol/order-finance?order=${encodeURIComponent(pkg.orderNumber)}`,{cache:'no-store',signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'İade kayıtları alınamadı.');
    if(!controller.signal.aborted)setFinance(data as OrderFinance);
   }catch(error){if(!controller.signal.aborted)setFinanceError(error instanceof Error?error.message:'İade kayıtları alınamadı.');}
   finally{if(!controller.signal.aborted)setFinanceLoading(false);}
  }
  void load();return()=>controller.abort();
 },[pkg.orderNumber]);
 const money=(value:number|null|undefined)=>value==null?null:`${value.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})} ${pkg.currency}`;
 const tryMoney=(value:number|null|undefined)=>value==null||!Number.isFinite(Number(value))?null:`${Number(value).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ₺`;
 const shipping=pkg.shipping;
 return <dialog ref={ref} className={s.dialog} aria-labelledby="trendyol-detail-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className={s.body}>
   <header className={s.header}><div><span className={s.channel}>Trendyol · Sipariş detayı</span><h2 id="trendyol-detail-title">Sipariş {pkg.orderNumber}</h2><p>{labels[pkg.status]||pkg.status} · {date(pkg.orderDate)}</p></div><button autoFocus onClick={onClose} aria-label="Detayı kapat">Kapat ✕</button></header>
   <div className={s.grid}>
    <section><h3>Sipariş bilgileri</h3><Fields rows={[["Sipariş numarası",pkg.orderNumber],["Paket numarası",pkg.packageId],["Sipariş tarihi",date(pkg.orderDate)],["Son güncelleme",date(pkg.lastModified)],["Ödeme yöntemi",pkg.paymentMethod],["Paket durumu",labels[pkg.status]||pkg.status]]}/></section>
    <section><h3>Kargo ve teslimat</h3><Fields rows={[["Kargo firması",shipping?.carrier],["Kargo takip kodu",shipping?.trackingNumber],["Gönderici kodu",shipping?.senderNumber],["Gönderi numarası",shipping?.shipmentNumber],["Tahmini teslimat başlangıcı",date(pkg.estimatedDeliveryStart)],["Tahmini teslimat sonu",date(pkg.estimatedDeliveryEnd)]]}/>{safeProviderLink(shipping?.trackingLink)&&<a href={safeProviderLink(shipping?.trackingLink)!} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Kargoyu takip et ↗</a>}</section>
    {([["Teslimat adresi",pkg.deliveryAddress],["Fatura adresi",pkg.billingAddress]] as const).map(([title,a])=><section key={title}><h3>{title}</h3>{a?<Fields rows={[["Ad soyad",a.name],["Telefon",a.phone],["Adres",a.address],["Mahalle",a.neighborhood],["İl / İlçe",[a.city,a.district].filter(Boolean).join(" / ")||null],["Posta kodu",a.postalCode],["Ülke",a.country],["Firma",a.company]]}/>:<p>Trendyol bu adres bilgisini paylaşmadı.</p>}</section>)}
   </div>
   <section><h3>Ürünler · {pkg.lines.reduce((sum,l)=>sum+l.quantity,0)} adet</h3><div className={s.products}>{pkg.lines.map((l,i)=><article key={i}><h4>{l.name}</h4><Fields rows={[["Adet",l.quantity],["SKU",l.sku],["Barkod",l.barcode],["Beden / ölçü",l.size],["Renk",l.color],["Birim fiyat",money(l.unitPrice)],["Brüt satır tutarı",money(l.grossAmount)],["Satır indirimi",money(l.discount)],["KDV oranı",l.vatRate==null?null:`%${l.vatRate}`],["Durum",l.status?(labels[l.status]||l.status):null],...(l.cancelReason?[["İptal nedeni",l.cancelReason] as [string,string]]:[])]}/></article>)}</div></section>
   <section aria-label="İade ve cari hesap" className={s.finance}><h3>İade ve cari hesap</h3>
    {financeLoading&&<p role="status">İade kayıtları yükleniyor…</p>}
    {financeError&&<p role="alert">{financeError} Siparişin iadesiz olduğu varsayılmıyor.</p>}
    {finance&&!finance.claims.length&&!finance.returns.length&&<p>Arşivde bu sipariş için iade kaydı bulunmadı. {finance.lastChecked?`Son kontrol: ${date(finance.lastChecked)}.`:'İade arşivi henüz kontrol edilmedi.'}</p>}
    {finance?.claims.map(claim=><article key={claim.claim_id}><h4>İade talebi</h4><Fields rows={[["Talep numarası",claim.claim_id],["İlgili paket",claim.original_package_id],["Durum",claim.statuses.map(status=>claimLabels[status]||status).join(', ')],["Talep tarihi",date(claim.claim_date)],["Son değişiklik",date(claim.modified_at)]]}/></article>)}
    {finance?.returns.map(row=><article key={row.transaction_id}><h4>Finansal iade kaydı</h4><Fields rows={[["İşlem numarası",row.transaction_id],["İlgili paket",row.package_id],["İşlem tarihi",date(row.transaction_at)],["Borç",tryMoney(row.debt)],["Alacak",tryMoney(row.credit)],["Komisyon kaydı",tryMoney(row.commission_amount)],["Satıcı geliri kaydı",tryMoney(row.seller_revenue)]]}/></article>)}
    <p>Finansal iade borcu tek başına net zarar değildir; komisyon, kupon, kargo ve ürün maliyetiyle birlikte değerlendirilir.</p>
   </section>
   <div className={s.grid}><section><h3>Tutar ve fatura</h3><Fields rows={[["Brüt tutar",money(pkg.grossAmount)],["Toplam indirim",money(pkg.discount)],["Paket toplamı",money(pkg.amount)],["Fatura numarası",pkg.invoiceNumber],["Fatura durumu",pkg.invoiceStatus]]}/>{safeProviderLink(pkg.invoiceLink)&&<a href={safeProviderLink(pkg.invoiceLink)!} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Faturayı görüntüle ↗</a>}</section>
   <section><h3>Sipariş geçmişi</h3>{pkg.history?.length?<ol className={s.history}>{pkg.history.map((event,i)=><li key={i}><strong>{labels[event.status]||event.status}</strong><span>{date(event.date)}</span></li>)}</ol>:<p>Durum geçmişi paylaşılmadı.</p>}</section></div>
   <footer><p>Bu sipariş burada iptal edilemez. Trendyol detayları salt okunurdur; eksik alanlar sıfır kabul edilmez.</p><a href="https://partner.trendyol.com" target="_blank" rel="noopener noreferrer">Trendyol satıcı panelinde aç ↗</a></footer>
  </div>
 </dialog>;
}
