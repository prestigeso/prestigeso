"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPanel() {
  // --- STATELER ---
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // 🟢 YENİ: Ürün arama state'i
  const [newProductImage, setNewProductImage] = useState<string>("");
  // Menü ve Modallar
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Ürün Düzenleme
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Kampanya Stateleri
  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<number[]>([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });

  // Ayarlar Stateleri
  const [pageSettings, setPageSettings] = useState({ marquee: "", heroTitle: "", heroSubtitle: "" });

  // --- VERİ ÇEKME ---
  // --- VERİ ÇEKME ---
  const fetchData = async () => {
    setLoading(true);
    // order() kısmını şimdilik kaldırdık, sadece tüm verileri dümdüz çekiyoruz
    const { data, error } = await supabase.from("products").select("*");
    
    if (error) {
      alert("HATA VAR KRAL: " + error.message); // Eğer bir hata varsa artık sessiz kalmayacak, bize söyleyecek!
    }
    
    if (data) {
      setDbProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    const savedMarquee = localStorage.getItem("prestigeso_campaign") || "";
    setPageSettings(prev => ({ ...prev, marquee: savedMarquee }));
  }, []);

  // --- İŞLEMLER ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("prestigeso_campaign", pageSettings.marquee);
    alert("Sayfa ayarları başarıyla kaydedildi!");
    setIsSettingsOpen(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Bu ürünü KALICI olarak kaldırmak istediğinize emin misiniz?")) return;
    await supabase.from("products").delete().eq("id", id);
    setEditingProduct(null);
    fetchData();
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("products").update({
      name: editingProduct.name,
      price: Number(editingProduct.price),
      category: editingProduct.category,
    }).eq("id", editingProduct.id);

    if (error) return alert("Hata: " + error.message);
    alert("Ürün başarıyla güncellendi!");
    setEditingProduct(null);
    fetchData();
  };

  const toggleCampaignProduct = (id: number) => {
    if (selectedCampaignProducts.includes(id)) {
      setSelectedCampaignProducts(prev => prev.filter(pId => pId !== id));
    } else {
      if (selectedCampaignProducts.length >= 3) return alert("En fazla 3 ürün seçebilirsiniz!");
      setSelectedCampaignProducts(prev => [...prev, id]);
    }
  };

  const getCampaignType = () => {
    if (selectedCampaignProducts.length === 1) return "📉 Fiyat İndirimi Kampanyası";
    if (selectedCampaignProducts.length > 1) return "🤝 Beraber Alım (Bundle) Kampanyası";
    return "Lütfen ürün seçin";
  };

  // 🟢 YENİ: Arama Filtresi (Küçük/büyük harf duyarsız)
  const filteredProducts = dbProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black pb-32">
      
      {/* 🟢 HEADER - ORTALANMIŞ BAŞLIK 🟢 */}
      <div className="bg-white px-6 py-5 shadow-sm flex items-center justify-center relative mb-6">
        <h1 className="text-xl font-black text-gray-900 tracking-widest uppercase">PRESTİGESO YÖNETİM PANELİ</h1>
        <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm absolute right-6 shadow-md">A</div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        
        {/* 1. KISIM: 4'LÜ ÜST PANEL */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bu Ayki Satışlar</p>
            <p className="text-2xl font-black text-green-600">0 ₺</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sipariş Adedi</p>
            <p className="text-2xl font-black text-gray-900">0</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Site Ziyaretleri</p>
            <p className="text-2xl font-black text-blue-600">0</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam Ürün</p>
            <p className="text-2xl font-black text-gray-900">{dbProducts.length}</p>
          </div>
        </div>

        {/* 2. KISIM: ORTA ALAN (ÜRÜN LİSTESİ VE ARAMA) */}
        <div>
          {/* 🟢 YENİ: Ürün Envanteri Başlığı ve Arama Çubuğu Yanyana 🟢 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500">Ürün Envanteri</h2>
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Envanterde ürün ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-lg">🔍</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? <p className="p-6 text-center text-gray-400">Yükleniyor...</p> : 
             filteredProducts.length === 0 ? <p className="p-6 text-center text-gray-400">Aramanıza uygun ürün bulunamadı.</p> :
             <div className="divide-y divide-gray-100">
               {filteredProducts.map(product => (
                 <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-4">
                     <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                     <div>
                       <h3 className="font-bold text-sm text-gray-900">{product.name}</h3>
                       <p className="text-xs text-blue-600 font-black">{product.price} ₺</p>
                     </div>
                   </div>
                   <button 
                     onClick={() => setEditingProduct(product)}
                     className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                   >
                     Düzenle
                   </button>
                 </div>
               ))}
             </div>
            }
          </div>
        </div>
      </div>

      {/* 3. KISIM: SOL ALT - SAYFAYI DÜZENLE BUTONU */}
      <div className="fixed bottom-6 left-6 z-40">
        <button onClick={() => setIsSettingsOpen(true)} className="bg-white text-black border border-gray-200 shadow-xl px-5 py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm">
          <span>⚙️</span> Özel Panel
        </button>
      </div>

      {/* 4. KISIM: SAĞ ALT - AKROBATİK FAB (+) BUTONU */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${isFabOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-10 pointer-events-none"}`}>
          <button onClick={() => { setIsFabOpen(false); setIsAddProductOpen(true); }} className="bg-white text-black border border-gray-200 shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-gray-50 w-max">
            <span>📦</span> Yeni Ürün Ekle
          </button>
          <button onClick={() => { setIsFabOpen(false); setIsCampaignOpen(true); }} className="bg-blue-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-blue-700 w-max">
            <span>🏷️</span> Kampanya Oluştur
          </button>
        </div>
        
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)} 
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all duration-300 z-50 ${isFabOpen ? "bg-red-500 text-white rotate-45" : "bg-black text-white rotate-0 hover:scale-105"}`}
        >
          +
        </button>
      </div>
            {/* YENİ ÜRÜN EKLE MODALI (Görsel Yüklemeli Versiyon) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">Yeni Ürün Ekle</h2>
              <button onClick={() => { setIsAddProductOpen(false); setNewProductImage(""); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem("name") as HTMLInputElement).value;
              const price = Number((form.elements.namedItem("price") as HTMLInputElement).value);
              const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
              const stock = Number((form.elements.namedItem("stock") as HTMLInputElement).value);
              const is_bestseller = (form.elements.namedItem("is_bestseller") as HTMLInputElement).checked;

              if (!newProductImage) return alert("Lütfen bilgisayarınızdan bir ürün görseli seçin!");

              // Görseli Base64 olarak Supabase'e kaydediyoruz
              const { error } = await supabase.from("products").insert([
                { name, price, category, image: newProductImage, stock, is_bestseller }
              ]);

              if (error) return alert("Hata: " + error.message);
              alert("Ürün başarıyla eklendi!");
              setIsAddProductOpen(false);
              setNewProductImage(""); // Formu temizle
              fetchData();
            }} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ürün Adı</label>
                <input required name="name" type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label>
                  <input required name="price" type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Stok</label>
                  <input required name="stock" type="number" defaultValue="1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                <select required name="category" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium">
                  <option value="hediye">Hediye & Dekor</option>
                  <option value="taki">Takı & Aksesuar</option>
                  <option value="kutu">Hediye Kutuları</option>
                </select>
              </div>

              {/* BİLGİSAYARDAN GÖRSEL SEÇME ALANI */}
              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Ürün Fotoğrafı Yükle</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Dosyayı Base64 formatına çeviriyoruz
                      const reader = new FileReader();
                      reader.onloadend = () => setNewProductImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer" 
                />
                
                {/* Yüklenen Resmin Önizlemesi */}
                {newProductImage && (
                  <div className="mt-3 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img src={newProductImage} alt="Önizleme" className="w-full h-full object-contain bg-white" />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  <input type="checkbox" name="is_bestseller" className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
                  <div>
                    <span className="font-bold text-sm block text-gray-900">Çok Satan Ürün</span>
                    <span className="text-[10px] text-gray-500 block">Vitrin listesinde 'Çok Satanlar' etiketini alır.</span>
                  </div>
                </label>
              </div>
              
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-gray-800 transition">
                🚀 VİTRİNE EKLE
              </button>
            </form>
          </div>
        </div>
      )}
      {/* --- MODALLAR (Aynı Şekilde Duruyor) --- */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Ürün Düzenle</h2>
              <button onClick={() => setEditingProduct(null)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            
            <form onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto space-y-4 pb-4">
              <img src={editingProduct.image} className="w-full h-40 object-cover rounded-xl border border-gray-200" alt=""/>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Başlık</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label>
                <input required type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
              </div>
              
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4">KAYDET</button>
            </form>

            <div className="pt-4 border-t border-gray-100 mt-2">
              <button onClick={() => handleDeleteProduct(editingProduct.id)} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100">
                🗑️ Ürünü Kaldır
              </button>
            </div>
          </div>
        </div>
      )}

      {isCampaignOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-12 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xl font-black">🏷️ Kampanya Oluştur</h2>
              <button onClick={() => setIsCampaignOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>

            <div className="overflow-y-auto space-y-6 flex-1 pr-2">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-800 font-bold uppercase tracking-widest mb-1">Kampanya Tipi</p>
                <p className="text-lg font-black text-blue-900">{getCampaignType()}</p>
                <p className="text-xs text-blue-600 mt-1">Sistem seçtiğiniz ürün sayısına göre kampanya tipini otomatik belirler.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ürün Seçimi (Maks 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {dbProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => toggleCampaignProduct(product.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedCampaignProducts.includes(product.id) ? "border-blue-600 scale-95" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={product.image} className="w-full h-full object-cover" alt=""/>
                      {selectedCampaignProducts.includes(product.id) && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center backdrop-blur-sm">
                          <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Başlangıç</label>
                  <input type="date" value={campaignDates.start} onChange={e => setCampaignDates({...campaignDates, start: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Bitiş</label>
                  <input type="date" value={campaignDates.end} onChange={e => setCampaignDates({...campaignDates, end: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium"/>
                </div>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase mt-4 active:scale-95 shadow-lg" onClick={() => { alert("Veritabanında kampanya tablosu açıldığında bu işlem aktif olacaktır."); setIsCampaignOpen(false); }}>
              Kampanyayı Başlat
            </button>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">⚙️ Özel Sayfa Paneli</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kayan Yazı (Kampanya Bandı)</label>
                <input type="text" value={pageSettings.marquee} onChange={e => setPageSettings({...pageSettings, marquee: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium" />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Büyük Resim Başlığı</label>
                <input type="text" value={pageSettings.heroTitle} onChange={e => setPageSettings({...pageSettings, heroTitle: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium" placeholder="Örn: Yeni Sezon" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Büyük Resim Açıklaması</label>
                <textarea rows={2} value={pageSettings.heroSubtitle} onChange={e => setPageSettings({...pageSettings, heroSubtitle: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none" placeholder="Örn: En şık masa süslerini keşfedin..."></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ana Vitrin Görseli</label>
                <button type="button" className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl text-sm font-bold border border-gray-200">📸 Fotoğraf Seç / Değiştir</button>
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest mt-2 shadow-xl">Tüm Ayarları Kaydet</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}