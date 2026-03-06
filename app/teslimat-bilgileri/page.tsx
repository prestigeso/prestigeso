import Link from "next/link";

export default function DeliveryInfoPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Teslimat Bilgileri
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        <div className="space-y-10">
          
          {/* 1. TESLİMAT SÜRECİ */}
          <section className="flex gap-4">
            <div className="hidden sm:flex flex-col items-center mt-1">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-lg shadow-md">📦</div>
              <div className="w-0.5 h-full bg-gray-100 mt-2"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Teslimat Süreci ve Zaman Çizelgesi</h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
                Verilen siparişler, banka ve finans onayı alındıktan sonra en fazla <strong className="text-black">3 iş günü (Pazartesi-Cumartesi)</strong> içerisinde teslim edilir. Saat <strong className="text-black">16:00'dan sonra</strong> verilen siparişler ertesi gün işleme alınır. Bayram ve resmi tatil günlerinde kargo gönderimi yapılmamaktadır.
              </p>
            </div>
          </section>

          {/* 2. KARGO ÜCRETLERİ VE KAPIDA ÖDEME */}
          <section className="flex gap-4">
            <div className="hidden sm:flex flex-col items-center mt-1">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-lg shadow-md">₺</div>
              <div className="w-0.5 h-full bg-gray-100 mt-2"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Kargo Ücretleri</h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
                "Kargo Bedelini Kapıda Ödemek İstiyorum" seçeneğini işaretlemişseniz; taşımacılık ve teslimat ücretleri siparişlerin içeriğine, seçilen teslimatın türüne ve teslimatın yapılacağı ile göre değişiklik gösterir. Siparişlerinizin ulaşım ücretini kargo teslimatını yapan kuryeye teslim anında yapmanız gerekecektir.
              </p>
              <p className="text-sm text-gray-500 font-bold mt-2">
                * Sitemiz, siz değerli müşterilerimizin kargo maliyetlerini minimize etmek için seçkin kargo şirketleriyle özel anlaşmalar yapmaktadır.
              </p>
            </div>
          </section>

          {/* 3. SİPARİŞ ULAŞMAZSA */}
          <section className="flex gap-4">
            <div className="hidden sm:flex flex-col items-center mt-1">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-lg shadow-md">🎧</div>
              <div className="w-0.5 h-full bg-gray-100 mt-2"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Siparişiniz Elinize Ulaşmadıysa</h2>
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed font-medium">
                  Siparişinizle ilgili her türlü soru ve sorununuzun çözümü için Müşteri Hizmetleri yetkililerimize e-posta göndermeniz yeterli olacaktır. Uzman ekibimiz en kısa sürede durumu değerlendirerek çözüm üretmek üzere sizinle iletişime geçecektir.
                </p>
              </div>
            </div>
          </section>

          {/* 4. TESLİMAT ANINDA DİKKAT EDİLMESİ GEREKENLER (Kritik Uyarılar) */}
          <section className="flex gap-4">
            <div className="hidden sm:flex flex-col items-center mt-1">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-lg shadow-md">⚠️</div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-black uppercase tracking-tight mb-4">Teslimat Anında Dikkat Edilecekler</h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <span className="font-black text-black mt-0.5">1.</span>
                  <p className="text-sm text-gray-600 font-medium">Siparişiniz kargoda zarar görmeyecek şekilde özenle ambalajlanır ve Türkiye’nin seçkin kargo şirketleri ile gönderilir.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="font-black text-black mt-0.5">2.</span>
                  <p className="text-sm text-gray-600 font-medium">Siparişinizdeki ürünler ilgili firmaların garantisi altındadır.</p>
                </div>
                
                {/* HASARLI KARGO UYARISI (Vurgulu) */}
                <div className="flex gap-3 items-start bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <span className="font-black text-orange-800 mt-0.5">3.</span>
                  <div className="space-y-1">
                    <p className="text-sm text-orange-900 font-bold">Hasarlı Paket Durumu</p>
                    <p className="text-sm text-orange-800 font-medium leading-relaxed">
                      Kargonuzda açılmış, yırtılmış veya fiziksel anlamda zarar görmüş bir durum varsa <strong className="text-orange-950 font-black">lütfen teslim almayınız</strong>. Kargo görevlisine siparişi zarar gördüğü için teslim almak istemediğinizi belirtiniz ve <strong className="text-orange-950 font-black">"Hasar Tespit Tutanağı"</strong> düzenletiniz. Tutanağın bir nüshasını mutlaka saklayınız.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="font-black text-black mt-0.5">4.</span>
                  <p className="text-sm text-gray-600 font-medium">Siparişinizde herhangi bir eksiklik veya yanlışlık varsa lütfen vakit kaybetmeden bize ulaşınız.</p>
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}