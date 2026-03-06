"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  user: any;
  addresses: any[];
  setAddresses: (val: any[]) => void;
};

export default function AddressesTab({ user, addresses, setAddresses }: Props) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: "", first_name: "", last_name: "", phone: "",
    city: "", district: "", neighborhood: "", full_address: "", is_default: false
  });

  // ŞEHİR, İLÇE VE MAHALLE VERİLERİ
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

  // ARAMA VE AÇILIR MENÜ STATELERİ
  const [showCitySelect, setShowCitySelect] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  
  const [showDistrictSelect, setShowDistrictSelect] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  
  const [showNeighborhoodSelect, setShowNeighborhoodSelect] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  // MODAL AÇILDIĞINDA ŞEHİRLERİ API'DEN ÇEK
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
        const json = await res.json();
        if (json.status === "OK") {
          const sorted = json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'));
          setCities(sorted);
        }
      } catch (error) {
        console.error("Şehirler yüklenemedi:", error);
      }
    };
    fetchCities();
  }, []);

  const handleAddressInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // İL SEÇİLİNCE: İlçeleri hazırla, Mahalleyi sıfırla
  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((c) => c.name === cityName);
    if (selectedCity) {
      const sortedDistricts = selectedCity.districts.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'));
      setDistricts(sortedDistricts);
    } else {
      setDistricts([]);
    }
    
    setAddressForm((prev) => ({ ...prev, city: cityName, district: "", neighborhood: "" })); 
    setNeighborhoods([]); // Yeni il seçildi, eski mahalleleri sil
    setShowCitySelect(false);
    setCitySearch(""); 
  };

  // İLÇE SEÇİLİNCE: API'den o ilçenin mahallelerini çek!
  const handleDistrictSelect = async (district: any) => {
    setAddressForm((prev) => ({ ...prev, district: district.name, neighborhood: "" }));
    setShowDistrictSelect(false);
    setDistrictSearch(""); 

    try {
      // Limit=1000 koyduk ki büyük ilçelerde mahalleler eksik kalmasın
      const res = await fetch(`https://turkiyeapi.dev/api/v1/neighborhoods?districtId=${district.id}&limit=1000`);
      const json = await res.json();
      if (json.status === "OK") {
        const sortedNeighborhoods = json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'));
        setNeighborhoods(sortedNeighborhoods);
      }
    } catch (error) {
      console.error("Mahalleler yüklenemedi:", error);
    }
  };

  // MAHALLE SEÇİLİNCE
  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressForm((prev) => ({ ...prev, neighborhood: neighborhoodName }));
    setShowNeighborhoodSelect(false);
    setNeighborhoodSearch(""); 
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if(!addressForm.city || !addressForm.district || !addressForm.neighborhood) {
      return alert("Lütfen İl, İlçe ve Mahalle seçiminizi yapınız!");
    }

    setIsSavingAddress(true);

    try {
      if (addressForm.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }

      const { error } = await supabase.from("addresses").insert([{ ...addressForm, user_id: user.id }]);
      if (error) throw error;

      alert("Adres başarıyla eklendi! 📍");
      setIsAddressModalOpen(false);
      setAddressForm({ title: "", first_name: "", last_name: "", phone: "", city: "", district: "", neighborhood: "", full_address: "", is_default: false });

      const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
      if (data) setAddresses(data);
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if(!window.confirm("Bu adresi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if(!error) setAddresses(addresses.filter(a => a.id !== id));
  };

  // KUSURSUZ TÜRKÇE ARAMA MOTORLARI
  const filteredCities = cities.filter(c => 
    c.name.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))
  );
  const filteredDistricts = districts.filter(d => 
    d.name.toLocaleLowerCase('tr-TR').includes(districtSearch.toLocaleLowerCase('tr-TR'))
  );
  const filteredNeighborhoods = neighborhoods.filter(n => 
    n.name.toLocaleLowerCase('tr-TR').includes(neighborhoodSearch.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-4">
        <h3 className="text-xl font-black uppercase tracking-tight text-black">Kayıtlı Adreslerim</h3>
        <button onClick={() => setIsAddressModalOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors">
          + Yeni Adres Ekle
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📍</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-4">Henüz kayıtlı bir adresiniz yok.</p>
          <button onClick={() => setIsAddressModalOpen(true)} className="bg-black text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95">
            Hemen Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border border-gray-200 rounded-2xl p-5 relative shadow-sm hover:border-black transition-all group flex flex-col">
              {addr.is_default && <span className="absolute top-4 right-4 bg-black text-white text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest">Varsayılan</span>}
              <h4 className="font-black text-sm uppercase text-black mb-3 pr-20">{addr.title}</h4>
              <div className="space-y-1 mb-4 flex-1">
                <p className="text-xs font-bold text-gray-800">{addr.first_name} {addr.last_name}</p>
                <p className="text-xs font-medium text-gray-500">{addr.phone}</p>
                <p className="text-xs font-medium text-gray-500">{addr.neighborhood} - {addr.district} / {addr.city}</p>
                <p className="text-[11px] font-medium text-gray-400 line-clamp-2 mt-2 leading-relaxed">{addr.full_address}</p>
              </div>
              <div className="flex justify-end border-t border-gray-50 pt-3">
                <button onClick={() => handleDeleteAddress(addr.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1">
                  <span>🗑️</span> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">Yeni Adres Ekle</h2>
              <button onClick={() => setIsAddressModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
            </div>
            
            <form onSubmit={handleSaveAddress} className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Adres Başlığı *</label>
                <input required name="title" value={addressForm.title} onChange={handleAddressInputChange} type="text" placeholder="Örn: Evim, İş Yerim" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad *</label>
                  <input required name="first_name" value={addressForm.first_name} onChange={handleAddressInputChange} type="text" placeholder="Adınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Soyad *</label>
                  <input required name="last_name" value={addressForm.last_name} onChange={handleAddressInputChange} type="text" placeholder="Soyadınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Telefon *</label>
                  <input required name="phone" value={addressForm.phone} onChange={handleAddressInputChange} type="tel" placeholder="0 (5__) ___ __ __" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
                
                {/* 1. İL SEÇİCİ */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İl *</label>
                  <div 
                    onClick={() => { setShowCitySelect(!showCitySelect); setShowDistrictSelect(false); setShowNeighborhoodSelect(false); }}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium cursor-pointer flex justify-between items-center hover:border-black transition-all"
                  >
                    <span className={addressForm.city ? "text-black" : "text-gray-400"}>{addressForm.city || "İl Seçiniz"}</span>
                    <span className="text-[10px]">▼</span>
                  </div>
                  {showCitySelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowCitySelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="İl Ara..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {filteredCities.map(c => (
                            <div key={c.id} onClick={() => handleCitySelect(c.name)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">{c.name}</div>
                          ))}
                          {filteredCities.length === 0 && <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. İLÇE SEÇİCİ */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İlçe *</label>
                  <div 
                    onClick={() => { if(addressForm.city) { setShowDistrictSelect(!showDistrictSelect); setShowCitySelect(false); setShowNeighborhoodSelect(false); } }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all ${!addressForm.city ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"}`}
                  >
                    <span className={addressForm.district ? "text-black" : "text-gray-400"}>{addressForm.district || "İlçe Seçiniz"}</span>
                    <span className="text-[10px]">▼</span>
                  </div>
                  {showDistrictSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowDistrictSelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="İlçe Ara..." value={districtSearch} onChange={(e) => setDistrictSearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {filteredDistricts.map(d => (
                            <div key={d.id} onClick={() => handleDistrictSelect(d)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">{d.name}</div>
                          ))}
                          {filteredDistricts.length === 0 && <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. MAHALLE SEÇİCİ (YENİ) */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mahalle *</label>
                  <div 
                    onClick={() => { if(addressForm.district) { setShowNeighborhoodSelect(!showNeighborhoodSelect); setShowCitySelect(false); setShowDistrictSelect(false); } }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all ${!addressForm.district ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"}`}
                  >
                    <span className={addressForm.neighborhood ? "text-black line-clamp-1" : "text-gray-400"}>{addressForm.neighborhood || "Mahalle Seçiniz"}</span>
                    <span className="text-[10px] ml-2">▼</span>
                  </div>
                  {showNeighborhoodSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowNeighborhoodSelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="Mahalle Ara..." value={neighborhoodSearch} onChange={(e) => setNeighborhoodSearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {neighborhoods.length === 0 ? (
                             <div className="p-3 text-xs font-bold text-gray-400 animate-pulse">Yükleniyor...</div>
                          ) : filteredNeighborhoods.length > 0 ? (
                             filteredNeighborhoods.map(n => (
                              <div key={n.id || n.name} onClick={() => handleNeighborhoodSelect(n.name)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                                {n.name}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Açık Adres *</label>
                <textarea required name="full_address" value={addressForm.full_address} onChange={handleAddressInputChange} rows={3} placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl bg-gray-50">
                <input type="checkbox" name="is_default" checked={addressForm.is_default} onChange={handleAddressInputChange} className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
                <div>
                  <span className="font-bold text-sm block text-gray-900">Varsayılan Adres Olarak Kaydet</span>
                  <span className="text-[10px] text-gray-500">Sonraki siparişlerinizde otomatik seçilir.</span>
                </div>
              </label>

              <button type="submit" disabled={isSavingAddress} className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-md active:scale-95 transition-all mt-4">
                {isSavingAddress ? "Kaydediliyor..." : "Adresi Kaydet 📍"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}