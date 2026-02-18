"use client";

import Hero from "@/components/Hero"; 
import Footer from "@/components/Footer"; 
import ProductCard from "@/components/ui/ProductCard";
import { useState } from "react";

export default function Home() {
  // Başlangıçta boş bir liste olsun, butona basınca dolacak
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false);

  // --- SCRAPER FONKSİYONU ---
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        // Arkadaşının eski sitesinden verileri çekiyoruz
        body: JSON.stringify({ url: 'https://prestigeso.com' }), 
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.products);
        setIsDataFetched(true);
        // Sayfayı ürünlere doğru kaydır (UX iyileştirmesi)
        setTimeout(() => {
            document.getElementById('urunler')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      } else {
        alert("Hata: " + data.error);
      }
    } catch (err) {
      alert("Bir şeyler ters gitti! Konsola bak.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      
      
      {/* 2. Vitrin (Hero) - Siteye profesyonel hava katan kısım */}
      <Hero />
      
      <div className="max-w-7xl mx-auto px-4 w-full mt-10 mb-20">
        
        {/* 3. Kontrol Paneli (Veri Çekme Butonu) */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center relative -mt-20 z-10 mx-4 lg:mx-0">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Veri Entegrasyonu
          </h2>
          <p className="text-gray-500 mb-6">
            Prestigeso.com üzerindeki mevcut ürünleri buraya aktarmak için aşağıdaki butonu kullanın.
          </p>
          
          <button 
            onClick={fetchProducts}
            disabled={loading}
            className={`
              px-8 py-4 rounded-full font-bold text-white text-lg transition-all transform hover:scale-105 shadow-xl
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Veriler Analiz Ediliyor...
              </span>
            ) : (
              "🚀 Mevcut Ürünleri Getir"
            )}
          </button>

          {isDataFetched && (
             <p className="text-green-600 font-medium mt-4 animate-pulse">
               ✅ {products.length} adet ürün başarıyla çekildi!
             </p>
          )}
        </div>

        {/* 4. Ürün Listesi */}
        <div id="urunler" className="mt-16 scroll-mt-24">
            {products.length > 0 ? (
                <>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-gray-900">Mağaza Koleksiyonu</h2>
                        <p className="text-gray-500">Eski siteden çekilen canlı veriler.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </>
            ) : (
                /* Veri çekilmediyse boş durmasın diye bilgilendirme */
                !loading && (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-xl text-gray-400">Henüz ürün yüklenmedi. Yukarıdaki butona basın.</p>
                    </div>
                )
            )}
        </div>
      </div>

      {/* 5. Footer */}
      <Footer />
    </main>
  );
}