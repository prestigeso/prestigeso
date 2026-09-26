'use client';
import { useRef, useState } from 'react';
import { adminDb } from './adminDb';
import { parseTryAmount } from '@/lib/finance/contribution';
import type { ProductRow, CategoryRow } from './types';
import s from './AdminStudio.module.css';

type Field = 'price' | 'stock' | 'category' | 'cost' | 'is_bestseller';
type Plan = { product: ProductRow; before: Partial<Record<Field, string>>; costVersion: number; requestId: string };
type Preview = { signature: string; plans: Plan[]; fields: Field[]; values: Partial<Record<Field, string>>; deleteMode: boolean };
const fields: Field[] = ['category','cost','price','stock','is_bestseller'];
const labels: Record<Field, string> = { price: 'Fiyat', stock: 'Stok', category: 'Kategori', cost: 'Birim maliyet (KDV dahil)', is_bestseller: 'Çok satan' };
const money = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const status = (value: string) => value === 'true' ? 'Çok satan' : 'Çok satan değil';
const after = (field: Field, value: string) => field === 'price' || field === 'cost' ? money(Number(value.replace(',', '.'))) : field === 'is_bestseller' ? status(value) : value;

export default function ProductBulkActions({ products, categories, onBusy, onDone }: {
  products: ProductRow[]; categories: CategoryRow[]; onBusy: (busy: boolean) => void;
  onDone: (failed: number[], message: string) => void;
}) {
  const [chosen,setChosen] = useState<Field[]>(['price']);
  const [values,setValues] = useState<Partial<Record<Field,string>>>({});
  const [deleteMode,setDeleteMode] = useState(false);
  const [confirmation,setConfirmation] = useState('');
  const [preview,setPreview] = useState<Preview|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const lock = useRef(false);
  const signature = products.map(p=>p.id).join(',');
  const ready = preview?.signature === signature ? preview : null;
  function valid() {
    if (!products.length || products.length > 25) return false;
    if (deleteMode) return true;
    if (!chosen.length) return false;
    return chosen.every(f => {
      const v = values[f] || '';
      if (f === 'category') return categories.some(c=>c.name===v);
      if (f === 'is_bestseller') return v==='true'||v==='false';
      if (f === 'stock') return /^\d+$/.test(v)&&Number(v)<=1e9;
      try { return parseTryAmount(v)!==null; } catch { return false; }
    });
  }
  function invalidate() { setPreview(null);setConfirmation('');setError(''); }
  function pending(flag:boolean) { lock.current=flag;setBusy(flag);onBusy(flag); }
  async function prepare() {
    if (lock.current || !valid()) return;
    pending(true);setError('');
    try {
      if (!deleteMode && chosen.includes('cost')) {
        const skus = products.map(p => p.SKU?.trim()).filter(Boolean);
        if (skus.length !== products.length || new Set(skus).size !== skus.length) throw Error('Seçimde SKU eksik veya tekrarlı; maliyet kaydı ürün başına doğrulanamadı.');
      }
      const plans: Plan[]=[];
      for (const product of products) {
        const before:Plan['before']={};let costVersion=0;
        for (const f of chosen) {
          if (f==='category') before[f]=product.category||'Kategori yok';
          if (f==='price') before[f]=money(Number(product.price));
          if (f==='stock') before[f]=String(product.stock);
          if (f==='is_bestseller') before[f]=product.is_bestseller?'Çok satan':'Çok satan değil';
          if (f==='cost' && !deleteMode) {
            if (!product.SKU?.trim()) throw Error(`${product.name}: maliyet için SKU gerekli.`);
            const response=await fetch('/api/admin/phase2/records?'+new URLSearchParams({kind:'product_cost',key:product.SKU.trim()}),{cache:'no-store'});
            const data=await response.json();
            if (!response.ok||data.truncated||!Array.isArray(data.records)) throw Error('Maliyet kayıtları okunamadı; hiçbir değişiklik yapılmadı.');
            const record=data.records[0];costVersion=record?.version??0;
            before.cost=record?.payload?.amountMinor==null?'Bilinmiyor':`${money(record.payload.amountMinor/100)} · ${record.payload.taxBasis==='inclusive'?'KDV dahil':'KDV hariç'}`;
          }
        }
        plans.push({product,before,costVersion,requestId:crypto.randomUUID()});
      }
      setPreview({signature,plans,fields:[...chosen],values:{...values},deleteMode});
    } catch(e) {setError(e instanceof Error?e.message:'Önizleme alınamadı.');}
    finally {pending(false);}
  }
  async function apply() {
    if (lock.current||!ready||!valid()||(ready.deleteMode&&confirmation!=='SİL')) return;
    pending(true);setError('');
    const failed:number[]=[];let partial=0;
    try {
      for (const plan of ready.plans) {
        let productSaved=false;
        try {
          if (ready.deleteMode) {
            const result=await adminDb<{id:number}[]>({action:'delete',table:'products',filters:[{column:'id',op:'eq',value:plan.product.id}]});
            if (result.error) throw Error('Silme doğrulanamadı');
          } else {
            const changes:Record<string,string|number|boolean>={};
            for(const f of ready.fields) {
              if(f==='cost') continue;
              const value=ready.values[f]!;
              changes[f]=f==='category'?value:f==='is_bestseller'?value==='true':Number(value.replace(',','.'));
            }
            if(Object.keys(changes).length) {
              const result=await adminDb<{id:number}[]>({action:'update',table:'products',filters:[{column:'id',op:'eq',value:plan.product.id}],data:changes});
              if(result.error||!result.data?.some(row=>row.id===plan.product.id)) throw Error('Ürün alanları doğrulanamadı');
              productSaved=true;
            }
            if(ready.fields.includes('cost')) {
              const response=await fetch('/api/admin/phase2/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:plan.requestId,expectedVersion:plan.costVersion,kind:'product_cost',key:plan.product.SKU.trim(),amount:ready.values.cost,taxBasis:'inclusive',note:'Toplu ürün maliyeti güncellemesi'})});
              if(!response.ok) throw Error('Maliyet doğrulanamadı');
            }
          }
        } catch { failed.push(plan.product.id);if(productSaved)partial++; }
      }
      onDone(failed,`${ready.plans.length-failed.length} ürün ${ready.deleteMode?'silindi':'tüm seçili alanlarda güncellendi'}.${partial?` ${partial} üründe ürün alanları kaydedildi ancak maliyet doğrulanamadı.`:''}${failed.length?` ${failed.length} ürün kontrol için seçili bırakıldı; tekrar önizleyin.`:''}`);
    } finally {pending(false);}
  }
  return <section className={s.panel} aria-label="Toplu ürün işlemleri">
    <h2>Toplu ürün işlemleri</h2>
    <p className={s.muted}>{products.length} seçili ürün · Birden çok alanı aynı önizlemede seçebilirsiniz. Varyantların fiyat ve stokları ayrı yönetilir.</p>
    <fieldset disabled={busy} className={s.bulkChoices} aria-label="Değiştirilecek alanlar">
      {fields.map(f=><label key={f}><input type="checkbox" checked={!deleteMode&&chosen.includes(f)} disabled={deleteMode} onChange={e=>{setChosen(prev=>e.target.checked?[...prev,f]:prev.filter(x=>x!==f));invalidate();}} />{labels[f]}</label>)}
      <label><input type="checkbox" checked={deleteMode} onChange={e=>{setDeleteMode(e.target.checked);invalidate();}} />Ürünleri sil (ayrı işlem)</label>
    </fieldset>
    {!deleteMode&&<fieldset disabled={busy} className={s.bulkFields} aria-label="Yeni değerler">{chosen.map(f=><label className={s.field} key={f}>{labels[f]}{f==='category'?<select aria-label={`${labels[f]} yeni değer`} value={values[f]||''} onChange={e=>{setValues(v=>({...v,[f]:e.target.value}));invalidate();}}><option value="">Kategori seçin</option>{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>:f==='is_bestseller'?<select aria-label={`${labels[f]} yeni değer`} value={values[f]||''} onChange={e=>{setValues(v=>({...v,[f]:e.target.value}));invalidate();}}><option value="">Seçin</option><option value="true">Çok satan olarak işaretle</option><option value="false">Çok satan işaretini kaldır</option></select>:<input aria-label={`${labels[f]} yeni değer`} inputMode={f==='stock'?'numeric':'decimal'} value={values[f]||''} maxLength={16} onChange={e=>{setValues(v=>({...v,[f]:e.target.value}));invalidate();}} />}</label>)}</fieldset>}
    {chosen.includes('cost')&&!deleteMode&&<p className={s.muted}>Maliyet KDV dahil birim tutardır. Finans geçmişine kaydedilir; eski siparişlerin maliyeti değişmez. Boş değer kabul edilmez, 0 gerçek sıfır maliyettir.</p>}
    {deleteMode&&<p className={s.error}>Seçili ürünler kalıcı olarak silinir. Görsel dosyaları otomatik silinmez.</p>}
    {error&&<p role="alert" className={s.error}>{error}</p>}
    {ready?<><div className={`${s.table} ${s.bulkPreview}`}><table><thead><tr><th>Ürün</th><th>Önce</th><th>Sonra</th></tr></thead><tbody>{ready.plans.map(p=><tr key={p.product.id}><td data-label="Ürün"><div>{p.product.name}</div></td><td data-label="Önce"><div>{ready.deleteMode?'Mağazada kayıtlı':ready.fields.map(f=><div key={f}>{labels[f]}: {p.before[f]}</div>)}</div></td><td data-label="Sonra"><div>{ready.deleteMode?'Kalıcı olarak silinecek':ready.fields.map(f=><div key={f}>{labels[f]}: {after(f,ready.values[f]!)}</div>)}</div></td></tr>)}</tbody></table></div>
      {ready.deleteMode&&<label className={s.field}>Onaylamak için SİL yazın<input value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)} /></label>}
      <button className={s.primary} disabled={busy||(ready.deleteMode&&confirmation!=='SİL')} onClick={()=>void apply()}>{busy?'Uygulanıyor…':ready.deleteMode?`${ready.plans.length} ürünü kalıcı sil`:'Tüm değişiklikleri onayla'}</button>
    </>:<button className={s.button} disabled={busy||!valid()} onClick={()=>void prepare()}>{busy?'Önizleme hazırlanıyor…':'Değişiklikleri önizle'}</button>}
  </section>;
}
