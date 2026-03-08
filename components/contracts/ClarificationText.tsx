import React from "react";

export default function ClarificationText() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
      <section>
        <h3 className="font-black text-black uppercase mb-2">KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ</h3>
        <p>Prestigeso.com.tr olarak kişisel verilerinizin güvenliği hususuna azami hassasiyet göstermekteyiz. Bu bilinçle, ürün ve hizmetlerimizden faydalanan kişiler dahil, şirketimiz ile ilişkili tüm şahıslara ait her türlü kişisel verilerin 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVK Kanunu")'na uygun olarak işlenerek muhafaza edilmesine büyük önem atfetmekteyiz.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">1. Veri Sorumlusu</h3>
        <p>KVK Kanunu uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla Prestigeso.com.tr (Hıdır Şanlı) tarafından aşağıda açıklanan kapsamda işlenebilecektir.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">2. Kişisel Verilerin Hangi Amaçla İşleneceği</h3>
        <p>Toplanan kişisel verileriniz (Ad, soyad, e-posta, telefon, adres, sipariş bilgileri vb.);</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Şirketimiz tarafından sunulan ürün ve hizmetlerden sizleri faydalandırmak için gerekli çalışmaların iş birimlerimiz tarafından yapılması,</li>
          <li>Siparişlerinizin teslimatı, iade ve değişim süreçlerinin yönetilmesi,</li>
          <li>Müşteri kayıtlarının oluşturulması ve yönetilmesi,</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h3>
        <p>Toplanan kişisel verileriniz; yasal yükümlülüklerimizi yerine getirmek amacıyla yetkili kamu kurum ve kuruluşlarıyla; sipariş teslimat süreçlerinin yürütülmesi amacıyla kargo firmalarıyla Kanun’un 8. ve 9. maddelerinde belirtilen şartlar çerçevesinde paylaşılabilecektir.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">4. Kişisel Veri Sahibinin Hakları</h3>
        <p>KVK Kanunu'nun 11. maddesi uyarınca veri sahipleri; kişisel veri işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahiptir. Başvurularınızı info@prestigeso.com adresine iletebilirsiniz.</p>
      </section>
    </div>
  );
}