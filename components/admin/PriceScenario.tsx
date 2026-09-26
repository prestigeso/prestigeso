'use client';
import { useState } from 'react';
import { parseTryAmount } from '@/lib/finance/contribution';
import { breakeven } from '@/lib/finance/breakeven';
export default function PriceScenario() {
  const [fixed, setFixed] = useState(''), [rate, setRate] = useState(''), [margin, setMargin] = useState('');
  let price: number | null = null, error = '';
  try { const f = parseTryAmount(fixed), r = parseTryAmount(rate), m = parseTryAmount(margin); if (f !== null && r !== null && m !== null) price = breakeven(f, r, m); } catch { error = 'Geçerli pozitif değerler girin. Kesinti ve hedef katkı oranı toplamı %100’den küçük olmalı.'; }
  return <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="text-xl font-bold">Başa baş / hedef fiyat senaryosu</h2>
    <p className="text-sm">PrestigeSOMS akışından uyarlama. Oranlar otomatik tahmin edilmez. Vergi/komisyon mevzuat hesabı değildir; tek vergi esasıyla kendi doğruladığınız efektif oranı girin. Ürün fiyatını değiştirmez.</p>
    <div className="grid md:grid-cols-3 gap-3"><label>Satış başına sabit maliyet (TL)<input className="border p-2 block w-full" inputMode="decimal" value={fixed} onChange={e => setFixed(e.target.value)} /></label><label>Satıştan toplam kesinti (%)<input className="border p-2 block w-full" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} /></label><label>Hedef katkı (%) — başa baş için 0<input className="border p-2 block w-full" inputMode="decimal" value={margin} onChange={e => setMargin(e.target.value)} /></label></div>
    {error && <p role="alert">{error}</p>}<p aria-live="polite">Senaryo satış fiyatı: {price === null ? 'Alanları doldurun' : `${(price / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}</p>
  </section>;
}
