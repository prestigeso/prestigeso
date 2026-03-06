import Link from "next/link";

export default function PrivacyPolicyModernPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Gizlilik Politikası
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        {/* Metin İçeriği */}
        <div className="space-y-8 text-sm md:text-base leading-relaxed text-gray-600 font-medium">
          
          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">1. Topladığımız Bilgiler</h2>
            <p className="mb-3">Size hizmet sunabilmek ve deneyiminizi geliştirebilmek için aşağıdaki türde bilgileri toplayabiliriz:</p>
            <ul className="space-y-2 pl-2">
              <li className="flex items-start gap-2">
                <span className="text-black mt-0.5">•</span>
                <span><strong className="text-black">Kimlik Bilgileri:</strong> Ad, soyad, doğum tarihi vb.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black mt-0.5">•</span>
                <span><strong className="text-black">İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres vb.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black mt-0.5">•</span>
                <span><strong className="text-black">Cihaz ve Kullanım Bilgileri:</strong> IP adresi, tarayıcı türü, ziyaret süresi ve ziyaret edilen sayfalar gibi teknik veriler.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black mt-0.5">•</span>
                <span><strong className="text-black">Çerezler:</strong> Web sitemizde gezinme deneyiminizi iyileştirmek için çerezleri kullanabiliriz.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">2. Bilgilerin Kullanım Amaçları</h2>
            <p className="mb-3">Topladığımız bilgileri aşağıdaki amaçlarla kullanabiliriz:</p>
            <ul className="space-y-2 pl-2">
              <li className="flex items-center gap-2"><span className="text-black">•</span> Hizmetlerimizi sunmak ve geliştirmek</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Müşteri desteği sağlamak</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Kullanıcı deneyimini kişiselleştirmek</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Pazarlama ve tanıtım faaliyetleri yürütmek (izniniz dahilinde)</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Yasal yükümlülüklerimizi yerine getirmek</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">3. Bilgilerin Paylaşımı</h2>
            <p className="mb-3">Kişisel verileriniz, üçüncü şahıslarla yalnızca aşağıdaki durumlarda paylaşılabilir:</p>
            <ul className="space-y-2 pl-2">
              <li className="flex items-center gap-2"><span className="text-black">•</span> Hizmet sağlayıcılarımızla (barındırma, analiz hizmetleri vb.)</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Yasal zorunluluklar doğrultusunda resmi makamlarla</li>
              <li className="flex items-center gap-2"><span className="text-black">•</span> Açık rızanız doğrultusunda</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">4. Verilerin Saklanması ve Güvenliği</h2>
            <p>
              Verileriniz, ilgili mevzuatlara uygun şekilde güvenli sunucularda saklanmakta ve yetkisiz erişim, ifşa, değiştirme veya imhaya karşı korunmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">5. Haklarınız</h2>
            <p className="mb-3">KVKK ve/veya GDPR kapsamındaki yasal haklarınız şunlardır:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 mb-4">
              <div className="flex items-center gap-2"><span className="text-black font-bold">✓</span> Kişisel verilerinize erişme</div>
              <div className="flex items-center gap-2"><span className="text-black font-bold">✓</span> Verilerin düzeltilmesini veya silinmesini isteme</div>
              <div className="flex items-center gap-2"><span className="text-black font-bold">✓</span> Veri işlemeye itiraz etme</div>
              <div className="flex items-center gap-2"><span className="text-black font-bold">✓</span> Veri taşınabilirliği talep etme</div>
              <div className="flex items-center gap-2"><span className="text-black font-bold">✓</span> Rızanızı geri çekme</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl mt-4">
              <p>
                Bu haklarınızı kullanmak için bizimle <a href="mailto:info@prestigeso.com" className="text-black font-bold border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors">info@prestigeso.com</a> üzerinden iletişime geçebilirsiniz.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-black mb-3 uppercase tracking-tight">6. Politika Değişiklikleri</h2>
            <p>
              Gizlilik politikamız zaman zaman güncellenebilir. Değişiklikler bu sayfada yayınlanarak yürürlüğe girer. Önemli değişiklikler hakkında sizi bilgilendireceğiz.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}