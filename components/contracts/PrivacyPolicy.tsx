import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
      <section>
        <h3 className="font-black text-black uppercase mb-2">1. Topladığımız Bilgiler</h3>
        <p>Size hizmet sunabilmek ve deneyiminizi geliştirebilmek için aşağıdaki türde bilgileri toplayabiliriz:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, doğum tarihi vb.</li>
          <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres vb.</li>
          <li><strong>Cihaz ve Kullanım Bilgileri:</strong> IP adresi, tarayıcı türü, ziyaret süresi vb.</li>
          <li><strong>Çerezler:</strong> Gezinme deneyiminizi iyileştirmek için çerezleri kullanabiliriz.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">2. Bilgilerin Kullanım Amaçları</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hizmetlerimizi sunmak ve geliştirmek</li>
          <li>Müşteri desteği sağlamak</li>
          <li>Kullanıcı deneyimini kişiselleştirmek</li>
          <li>Pazarlama ve tanıtım faaliyetleri yürütmek (izniniz dahilinde)</li>
          <li>Yasal yükümlülüklerimizi yerine getirmek</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">3. Bilgilerin Paylaşımı</h3>
        <p>Kişisel verileriniz, yalnızca aşağıdaki durumlarda üçüncü şahıslarla paylaşılabilir:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Hizmet sağlayıcılarımızla (barındırma, analiz hizmetleri vb.)</li>
          <li>Yasal zorunluluklar doğrultusunda resmi makamlarla</li>
          <li>Açık rızanız doğrultusunda</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">4. Verilerin Saklanması ve Güvenliği</h3>
        <p>Verileriniz, ilgili mevzuatlara uygun şekilde güvenli sunucularda saklanmakta ve yetkisiz erişim, ifşa, değiştirme veya imhaya karşı korunmaktadır.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">5. Haklarınız</h3>
        <p>KVKK ve/veya GDPR kapsamındaki yasal haklarınız şunlardır:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Kişisel verilerinize erişme, düzeltilmesini veya silinmesini isteme</li>
          <li>Veri işlemeye itiraz etme, veri taşınabilirliği talep etme</li>
          <li>Rızanızı geri çekme</li>
        </ul>
        <p className="mt-4">Bu haklarınızı kullanmak için bizimle <strong className="text-black">info@prestigeso.com</strong> üzerinden iletişime geçebilirsiniz.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">6. Politika Değişiklikleri</h3>
        <p>Gizlilik politikamız zaman zaman güncellenebilir. Değişiklikler bu sayfada yayınlanarak yürürlüğe girer.</p>
      </section>
    </div>
  );
}