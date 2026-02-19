"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";

export default function Home() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Hızlı Bakış için seçili ürünü tutacağımız State
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Ürünleri Çekme İşlemi (Manuel butona bağladık)
  const fetchRealData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://prestigeso.com' }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      } else {
        alert("Ürünler çekilemedi, api'yi kontrol et.");
      }
    } catch (error) {
      console.error("Veri çekilemedi", error);
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Sayfa ilk açıldığında da bir kere çekmeyi denesin (İstersen silebilirsin, buton hep var)
  useEffect(() => {
    fetchRealData();
  }, []);

  // ESC tuşuna basınca modalı kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      
      {/* 1. HERO BÖLÜMÜ */}
      <div className="relative w-full h-[70vh] flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
        
        <div className="relative z-10 container mx-auto px-6 lg:px-12">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            Tarzını <span className="text-blue-500">Yeniden</span> Keşfet
          </h1>
          <p className="text-gray-300 max-w-lg mb-8 text-lg font-medium">
            Sezonun en trend parçaları, özel koleksiyonlar ve sana özel fırsatlar PrestigeSO'da.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold transition-colors">
              Alışverişe Başla
            </button>
            <button className="border border-white/50 hover:bg-white/10 text-white px-8 py-3.5 rounded-full font-bold backdrop-blur-sm transition-colors">
              Koleksiyonlar
            </button>
          </div>
        </div>
      </div>

      {/* 2. ÜRÜN LİSTESİ VE BUTON */}
      <div className="container mx-auto px-6 lg:px-12 py-16">
        
        {/* Başlık ve Ürün Getir Butonu Yan Yana */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-3xl font-black tracking-tight">Yeni Gelenler</h2>
          <button 
            onClick={fetchRealData}
            className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            Ürünleri Getir
          </button>
        </div>
        
        {products.length === 0 && !loading && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-gray-500 font-medium">Şu an mağazada hiç ürün yok. Butona tıklayarak ürünleri çekebilirsin.</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            // Yükleniyor iskeleti
            [1,2,3,4].map(i => <div key={i} className="bg-gray-100 aspect-[3/4] rounded-3xl animate-pulse"/>)
          ) : (
            products.map((product) => (
              <div 
                key={product.id} 
                className="group relative cursor-pointer" 
                onClick={() => setSelectedProduct(product)} 
              >
                <div className="aspect-[3/4] w-full overflow-hidden rounded-3xl bg-gray-100 relative">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out" 
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Hover olunca çıkan ufak detay ikonu */}
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                  <p className="mt-1 text-sm font-black text-blue-600">{product.price.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. HIZLI BAKIŞ MODALI */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
            onClick={() => setSelectedProduct(null)}
          />
          
          <div className="relative bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/80 backdrop-blur-md flex items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 active:scale-90 transition-all shadow-sm"
            >
              ✕
            </button>

            <div className="md:w-1/2 h-[40vh] md:h-auto bg-gray-100 relative">
              <img 
                src={selectedProduct.image} 
                alt={selectedProduct.name} 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            <div className="md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-white">
              <div className="uppercase tracking-widest text-[10px] font-bold text-blue-600 mb-3">
                PrestigeSO Özel
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
                {selectedProduct.name}
              </h2>
              <p className="text-4xl font-black text-gray-900 mb-6 tracking-tighter">
                {selectedProduct.price.toLocaleString('tr-TR')} ₺
              </p>
              
              <div className="space-y-4 mb-8">
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  Sezonun en trend parçalarından biri. Kaliteli dokusu ve modern kesimiyle tarzınızı yeniden keşfedin. Stoklar tükenmeden sepetinize ekleyin.
                </p>
              </div>

              <button 
                onClick={() => {
                  addToCart({ ...selectedProduct, quantity: 1 });
                  setSelectedProduct(null); 
                }}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-transform shadow-xl shadow-black/20 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}